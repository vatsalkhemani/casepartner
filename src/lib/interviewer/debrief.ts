import { z } from "zod";
import type { CasePack } from "../case/schema";
import { generate, hasGemini } from "../llm/gemini";
import type { SessionState } from "./session";

export const DIMENSIONS = [
  { id: "opening", name: "Opening" },
  { id: "structure", name: "Structure" },
  { id: "driving", name: "Driving the case" },
  { id: "exhibits", name: "Exhibits" },
  { id: "math", name: "Math" },
  { id: "brainstorming", name: "Brainstorming" },
  { id: "recommendation", name: "Recommendation" },
  { id: "communication", name: "Communication" },
] as const;

export const Level = z.enum(["not_yet", "good_enough", "standout"]);
export type Level = z.infer<typeof Level>;

const JudgedDimension = z.object({
  id: z.string(),
  level: Level,
  evidence: z.array(z.string()).max(3).default([]),
  note: z.string().max(400),
});

const Judged = z.object({
  dimensions: z.array(JudgedDimension),
  moments: z.array(z.object({ quote: z.string(), title: z.string().max(80), better: z.string().max(300) })).max(3).default([]),
  drills: z.array(z.string().max(160)).max(3).default([]),
});

export type Debrief = {
  verdict: "advance" | "borderline" | "not_yet";
  decidedBy: string[];
  dimensions: { id: string; name: string; level: Level; evidence: string[]; note: string }[];
  moments: { quote: string; title: string; better: string; t?: number }[];
  drills: string[];
  signals: Signals;
  provisional: boolean;
  source: "model" | "rules";
};

// Facts measured by code, not judged by a model.
export type Signals = {
  minutes: number;
  candidateWords: number;
  talkShare: number;
  fillerPerHundred: number;
  bucketsSaid: number;
  permissionAsks: number;
  nudges: { partId: string; levels: number[] }[];
  mathAttempts: { partId: string; value: number; correct: boolean; errorType?: string }[];
  exhibitsSeen: number;
  reachedRecommendation: boolean;
};

const FILLERS = /\b(um+|uh+|erm|like,|you know|basically|kind of|sort of)\b/gi;
const PERMISSION = /\b(is it okay if|is it ok if|can i ask|would it be okay|do you mind if|may i)\b/gi;

export function measure(pack: CasePack, state: SessionState): Signals {
  const cand = state.transcript.filter((t) => t.role === "candidate");
  const all = state.transcript;
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const cw = cand.reduce((a, t) => a + count(t.text), 0);
  const aw = all.reduce((a, t) => a + count(t.text), 0) || 1;
  const joined = cand.map((t) => t.text).join(" ");
  return {
    minutes: Math.round(((all.at(-1)?.t ?? 0) / 60_000) * 10) / 10,
    candidateWords: cw,
    talkShare: Math.round((cw / aw) * 100),
    fillerPerHundred: cw ? Math.round(((joined.match(FILLERS)?.length ?? 0) / cw) * 1000) / 10 : 0,
    bucketsSaid: joined.match(/\bbuckets?\b/gi)?.length ?? 0,
    permissionAsks: joined.match(PERMISSION)?.length ?? 0,
    nudges: pack.parts.map((p) => ({ partId: p.id, levels: state.nudges[p.id] ?? [] })),
    mathAttempts: state.numericAttempts,
    exhibitsSeen: state.shownExhibits.length,
    reachedRecommendation: state.transcript.some((t) => t.role === "candidate" && t.phase === "synthesis"),
  };
}

// The verdict is a rule over the grades, so it is consistent and explainable.
export function verdictFrom(levels: Record<string, Level>, s: Signals): Debrief["verdict"] {
  const vals = Object.values(levels);
  const notYet = vals.filter((l) => l === "not_yet").length;
  const standout = vals.filter((l) => l === "standout").length;
  if (!s.reachedRecommendation || levels.recommendation === "not_yet" || notYet >= 3) return "not_yet";
  if (notYet === 0 && standout >= 2) return "advance";
  if (notYet <= 1 && standout >= 3) return "advance";
  return "borderline";
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// A quote counts only if the candidate actually said it.
function verifiedQuote(quote: string, said: string): boolean {
  const q = clean(quote);
  return q.length >= 8 && clean(said).includes(q);
}

function judgePrompt(pack: CasePack, state: SessionState, s: Signals): string {
  const parts = pack.parts.map((p) => ({ id: p.id, kind: p.kind, question: p.question, expected: p.expected, checks: p.checks }));
  return [
    "You are a second-year MBA who has given this case many times, scoring a practice case the way consulting firms do: not_yet, good_enough, or standout per dimension. Be honest and specific.",
    `CASE: ${pack.title}. Prompt: ${pack.prompt.readAloud}`,
    `Expected opening clarifiers: ${pack.opening.expectedClarifiers.join("; ")}. Sample framework: ${pack.sampleFramework.buckets.join(" | ")}`,
    `Parts with expected answers and checks: ${JSON.stringify(parts)}`,
    `Model recommendation: ${pack.synthesis.recommendation}`,
    `Measured by code: ${JSON.stringify(s)}`,
    `Flags the interviewer noted live: ${JSON.stringify(state.flags)}`,
    `TRANSCRIPT:\n${state.transcript.map((t) => `[${Math.round(t.t / 1000)}s ${t.phase}] ${t.role === "candidate" ? "CANDIDATE" : "INTERVIEWER"}: ${t.text}`).join("\n")}`,
    `Score each dimension: ${DIMENSIONS.map((d) => d.id).join(", ")}. Each nudge the candidate needed counts against "driving". Math is judged on APPROACH first: did they state the method before calculating, set it up correctly, and sanity-check the result? Rounding and stated assumptions are good practice, not errors. A right method with a small arithmetic slip is good_enough; a wrong method is not_yet; standout states the approach, rounds sensibly, and says what the number means. If a part was never reached, its dimension is not_yet.`,
    "evidence must be exact quotes of the CANDIDATE's words, copied verbatim, at most 3 per dimension. note is one or two sentences of feedback in second person. moments: the three moments that most affected the outcome, each with a verbatim candidate quote, a short title, and what a standout candidate would have said instead. drills: up to three specific practice drills.",
    'Reply with JSON only: {"dimensions":[{"id","level","evidence":[],"note"}],"moments":[{"quote","title","better"}],"drills":[]}',
  ].join("\n\n");
}

function ruleJudge(pack: CasePack, state: SessionState, s: Signals): z.infer<typeof Judged> {
  const said = (phase: string) => state.transcript.filter((t) => t.role === "candidate" && t.phase === phase).map((t) => t.text).join(" ");
  const nudgeTotal = s.nudges.reduce((a, n) => a + n.levels.length, 0);
  const math = s.mathAttempts;
  const lv = (good: boolean, great = false): Level => (great ? "standout" : good ? "good_enough" : "not_yet");
  const brainstormIds = new Set(pack.parts.filter((p) => p.kind === "brainstorm").map((p) => p.id));
  const brainstorm = state.transcript.filter((t) => t.role === "candidate" && t.partId && brainstormIds.has(t.partId)).map((t) => t.text).join(" ");
  const ideaGuess = brainstorm.split(/[,.;]|\band\b/).filter((x) => x.trim().split(/\s+/).length >= 3).length;
  const rec = said("synthesis");
  return {
    dimensions: [
      { id: "opening", level: lv(state.revealedFacts.length >= 2, state.revealedFacts.length >= 3), evidence: [], note: `You uncovered ${state.revealedFacts.length} clarifying facts.` },
      { id: "structure", level: lv(!state.structureProbed && s.reachedRecommendation, false), evidence: [], note: state.structureProbed ? "Your structure needed a probe to reach the cost side." : "Your structure covered the main branches." },
      { id: "driving", level: lv(nudgeTotal <= 3, nudgeTotal === 0), evidence: [], note: `You needed ${nudgeTotal} nudge${nudgeTotal === 1 ? "" : "s"}.` },
      { id: "exhibits", level: lv(s.exhibitsSeen >= 2), evidence: [], note: `You worked through ${s.exhibitsSeen} exhibit${s.exhibitsSeen === 1 ? "" : "s"}.` },
      { id: "math", level: lv(math.some((m) => m.correct), math.length > 0 && math.every((m) => m.correct)), evidence: [], note: math.length ? `${math.filter((m) => m.correct).length} of ${math.length} math attempts were right.` : "No math answer was given." },
      { id: "brainstorming", level: lv(ideaGuess >= 4, ideaGuess >= 7), evidence: [], note: `Roughly ${ideaGuess} distinct ideas.` },
      (() => {
        const full = /\d/.test(rec) && /risk/i.test(rec) && /next/i.test(rec);
        const level = lv(rec.split(/\s+/).length > 25, full);
        const note = !rec ? "You did not reach a recommendation." : full ? "You gave an answer backed by case numbers, with risks and a next step." : "Lead with the answer, back it with two case numbers, then name a risk and a next step.";
        return { id: "recommendation", level, evidence: [], note };
      })(),
      { id: "communication", level: lv(s.fillerPerHundred < 3 && s.permissionAsks < 3), evidence: [], note: `${s.fillerPerHundred} filler words per hundred, ${s.permissionAsks} permission asks.` },
    ],
    moments: [],
    drills: ["Recap a prompt in one sentence with every number in it", "Brainstorm drills: seven ideas in 60 seconds, grouped into two buckets", "Recommendation drill: answer, two reasons with numbers, one risk, one next step, under 60 seconds"],
  };
}

export async function makeDebrief(pack: CasePack, state: SessionState): Promise<Debrief> {
  const signals = measure(pack, state);
  const saidAll = state.transcript.filter((t) => t.role === "candidate").map((t) => t.text).join(" \n ");

  let judged: z.infer<typeof Judged>;
  let source: Debrief["source"] = "model";
  try {
    if (!hasGemini()) throw new Error("no model");
    const raw = await generate(judgePrompt(pack, state, signals), { role: "judge", json: true, temperature: 0.2, maxTokens: 8000, timeoutMs: 45_000 });
    judged = Judged.parse(JSON.parse(raw));
  } catch (e) {
    console.warn(`[debrief] model judge failed, using rules: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
    judged = ruleJudge(pack, state, signals);
    source = "rules";
  }

  const dimensions = DIMENSIONS.map((d) => {
    const j = judged.dimensions.find((x) => x.id === d.id);
    return {
      id: d.id,
      name: d.name,
      level: j?.level ?? "not_yet",
      evidence: (j?.evidence ?? []).filter((q) => verifiedQuote(q, saidAll)),
      note: j?.note ?? "",
    };
  });
  const levels = Object.fromEntries(dimensions.map((d) => [d.id, d.level])) as Record<string, Level>;
  const verdict = verdictFrom(levels, signals);

  const order = { not_yet: 0, good_enough: 1, standout: 2 } as const;
  const sorted = [...dimensions].sort((a, b) => order[a.level] - order[b.level]);
  const decidedBy =
    verdict === "advance"
      ? sorted.slice(-2).reverse().map((d) => `${d.name}: ${d.note}`)
      : sorted.slice(0, 2).map((d) => `${d.name}: ${d.note}`);

  const moments = judged.moments
    .filter((m) => verifiedQuote(m.quote, saidAll))
    .map((m) => ({ ...m, t: state.transcript.find((t) => t.role === "candidate" && clean(t.text).includes(clean(m.quote)))?.t }));

  // Judges are not yet validated against human casers (docs/EVALS.md E5).
  return { verdict, decidedBy, dimensions, moments, drills: judged.drills, signals, provisional: true, source };
}
