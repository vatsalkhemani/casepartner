import { CasePack, type CasePack as Pack } from "./schema";
import { lanternCoffee } from "../../../cases/library/lantern-coffee";

// Turning a casebook's pages into a case pack. The model reads the pages;
// code fills gaps, checks the result, and lists what a person should look at.

export type SourcePage = { n: number; text: string; image?: string }; // image: data URL (jpeg)

export function compilePrompt(book: string, caseTitle: string, pages: SourcePage[]): string {
  // The original case shows the shape. Exhibits are trimmed to keep it short.
  const example = { ...lanternCoffee, exhibits: lanternCoffee.exhibits.map((e) => ({ id: e.id, label: e.label, title: e.title, page: 0, table: e.table })) };
  return [
    `You are turning one case from a consulting casebook into a structured case pack that an AI interviewer will run. Book: "${book}". Case: "${caseTitle}".`,
    "The page images are attached in order. Their extracted text follows, marked by page number. Read the images for charts and tables; use the text to get words and numbers exactly right.",
    pages.map((p) => `--- PAGE ${p.n} ---\n${p.text.slice(0, 6000)}`).join("\n\n"),
    `Produce JSON in exactly this shape. Here is a complete example for a different, original case:\n${JSON.stringify(example)}`,
    [
      "Rules:",
      "- Use ONLY what the casebook says. Never invent numbers, facts or answers. If the book gives no answer for something, leave it out.",
      "- prompt.readAloud is the case prompt exactly as the interviewer would read it, in plain spoken English.",
      "- clarifyingFacts are the book's 'provide if asked' or 'additional information' items, each with 5-10 lowercase keywords a candidate might use when asking.",
      "- parts follow the book's numbered questions in order. kind is exhibit, math, brainstorm or qualitative. question is what the interviewer asks. unlockKeywords are words a candidate would use when asking for this part's data.",
      "- For math parts, expected.numeric holds each answer the book computes: value as a plain number in the unit given, unit like \"$M\", \"%\", \"units\", tolerancePct 5-12 so sensible rounding passes, and steps showing the book's working.",
      "- For brainstorm parts, expected.ideas lists the book's sample ideas with min 4 and standout 7 unless the book says otherwise.",
      "- nudges l1-l3 are hints of rising strength that never state the answer; l4 states the answer briefly. Write them in the interviewer's voice.",
      "- exhibits: one per exhibit in the book, id \"A\", \"B\"..., label as printed, title, page = the page number it is printed on, and table if the exhibit is a table or a chart you can read values from (otherwise omit table).",
      "- meta.formats: [\"interviewer_led\"] or [\"candidate_led\"] as the book says; include both if it does not say. difficulty 1-3. minutes about 25.",
      "- interviewerNotes carry the book's guidance to the interviewer, e.g. 'push for at least 4 ideas'.",
      "- id, version and source will be set by code; put anything there.",
    ].join("\n"),
    "Reply with the JSON only.",
  ].join("\n\n");
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const words = (s: string) => [...new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? [])].slice(0, 8);

type Loose = Record<string, unknown> & { parts?: Record<string, unknown>[]; exhibits?: Record<string, unknown>[]; clarifyingFacts?: Record<string, unknown>[] };

// Fill what the model tends to leave out, so one missing field does not sink a case.
export function normalise(raw: Loose, book: string, caseTitle: string): unknown {
  const exhibits = (raw.exhibits ?? []).map((e, i) => ({
    id: String(e.id ?? String.fromCharCode(65 + i)),
    label: String(e.label ?? `Exhibit ${String.fromCharCode(65 + i)}`),
    title: String(e.title ?? e.label ?? "Exhibit"),
    page: typeof e.page === "number" ? e.page : undefined,
    table: e.table && Array.isArray((e.table as { rows?: unknown }).rows) ? e.table : undefined,
  }));
  const ids = new Set(exhibits.map((e) => e.id));
  const fact = (f: Record<string, unknown>, i: number, prefix: string) => ({
    id: String(f.id ?? `${prefix}${i}`),
    topic: String(f.topic ?? "Detail"),
    keywords: Array.isArray(f.keywords) && f.keywords.length ? f.keywords.map(String) : words(`${f.topic ?? ""} ${f.answer ?? ""}`),
    answer: String(f.answer ?? ""),
    volunteerUpfront: !!f.volunteerUpfront,
  });
  const parts = (raw.parts ?? []).map((p, i) => {
    const expected = (p.expected ?? {}) as Record<string, unknown>;
    const nudges = (p.nudges ?? {}) as Record<string, string>;
    const q = String(p.question ?? "");
    return {
      id: String(p.id ?? `part-${i + 1}`),
      kind: ["exhibit", "math", "brainstorm", "qualitative"].includes(String(p.kind)) ? p.kind : "qualitative",
      question: q,
      unlockKeywords: Array.isArray(p.unlockKeywords) && p.unlockKeywords.length ? p.unlockKeywords.map(String) : words(q),
      exhibits: (Array.isArray(p.exhibits) ? p.exhibits.map(String) : []).filter((id) => ids.has(id)),
      facts: (Array.isArray(p.facts) ? (p.facts as Record<string, unknown>[]) : []).map((f, j) => fact(f, j, `p${i}f`)),
      expected: {
        insights: Array.isArray(expected.insights) ? expected.insights.map(String) : [],
        numeric: (Array.isArray(expected.numeric) ? (expected.numeric as Record<string, unknown>[]) : [])
          .filter((n) => Number.isFinite(Number(n.value)))
          .map((n, j) => ({
            id: String(n.id ?? `n${i}-${j}`),
            label: String(n.label ?? "Answer"),
            value: Number(n.value),
            unit: String(n.unit ?? ""),
            tolerancePct: Math.min(15, Math.max(3, Number(n.tolerancePct ?? 8))),
            steps: Array.isArray(n.steps) ? n.steps.map(String) : [],
          })),
        ...(expected.ideas ? { ideas: expected.ideas } : {}),
      },
      checks: Array.isArray(p.checks) ? p.checks.map(String) : [],
      nudges: {
        l1: nudges.l1 ?? "How would you approach that?",
        l2: nudges.l2 ?? "What would you want to look at first?",
        l3: nudges.l3 ?? "Think about what the data in front of you shows.",
        l4: nudges.l4 ?? "Let's move on.",
      },
      commonMistakes: Array.isArray(p.commonMistakes) ? p.commonMistakes : [],
    };
  });
  const meta = (raw.meta ?? {}) as Record<string, unknown>;
  const synth = (raw.synthesis ?? {}) as Record<string, unknown>;
  const prompt = (raw.prompt ?? {}) as Record<string, unknown>;
  const fw = (raw.sampleFramework ?? {}) as Record<string, unknown>;
  return {
    id: `upload-${slug(caseTitle)}-${Date.now().toString(36)}`,
    title: String(raw.title ?? caseTitle),
    version: 1,
    source: { kind: "upload", book },
    meta: {
      formats: Array.isArray(meta.formats) && meta.formats.length ? meta.formats : ["candidate_led", "interviewer_led"],
      type: String(meta.type ?? "Case"),
      industry: String(meta.industry ?? ""),
      difficulty: Math.min(3, Math.max(1, Number(meta.difficulty ?? 2))),
      stretchArea: String(meta.stretchArea ?? ""),
      minutes: Number(meta.minutes ?? 25),
    },
    client: String(raw.client ?? caseTitle),
    prompt: { readAloud: String(prompt.readAloud ?? ""), objective: String(prompt.objective ?? "") },
    clarifyingFacts: (raw.clarifyingFacts ?? []).map((f, i) => fact(f, i, "c")),
    opening: { expectedClarifiers: ((raw.opening as Record<string, unknown>)?.expectedClarifiers as string[]) ?? [] },
    sampleFramework: { buckets: Array.isArray(fw.buckets) ? fw.buckets.map(String) : [], hypothesis: String(fw.hypothesis ?? "") },
    parts,
    synthesis: {
      question: String(synth.question ?? "The CEO is walking in. What do you recommend?"),
      recommendation: String(synth.recommendation ?? ""),
      reasons: Array.isArray(synth.reasons) ? synth.reasons.map(String) : [],
      risks: Array.isArray(synth.risks) ? synth.risks.map(String) : [],
      nextSteps: Array.isArray(synth.nextSteps) ? synth.nextSteps.map(String) : [],
    },
    exhibits,
    interviewerNotes: Array.isArray(raw.interviewerNotes) ? raw.interviewerNotes.map(String) : [],
  };
}

// What a person should check before casing on it.
export function review(pack: Pack): string[] {
  const out: string[] = [];
  if (!pack.prompt.readAloud.trim()) out.push("No prompt was found. Check the page range starts at the case's first page.");
  if (!pack.clarifyingFacts.length) out.push("No clarifying facts were found, so Alex will answer most opening questions with 'we don't have that'.");
  pack.parts.forEach((p, i) => {
    if (p.kind === "math" && !p.expected.numeric.length) out.push(`Question ${i + 1} is math but no answer was found, so Alex cannot check the number.`);
    if (!p.question.trim()) out.push(`Question ${i + 1} has no wording.`);
  });
  const used = new Set(pack.parts.flatMap((p) => p.exhibits));
  pack.exhibits.filter((e) => !used.has(e.id)).forEach((e) => out.push(`${e.label} is not tied to any question, so it will never be shown.`));
  if (!pack.synthesis.recommendation.trim()) out.push("No sample recommendation was found; the debrief will judge the recommendation without one.");
  return out;
}

export function parsePack(json: unknown): { pack?: Pack; error?: string } {
  const r = CasePack.safeParse(json);
  return r.success ? { pack: r.data } : { error: r.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
