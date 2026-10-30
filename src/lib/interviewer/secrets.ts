import type { CasePack } from "../case/schema";
import type { SessionState } from "./session";

// Strings the candidate has not earned yet. Used to check anything that is
// about to be spoken, whether a model wrote it or not.

function numberForms(v: number): string[] {
  const forms = new Set<string>([String(v), v.toFixed(2), v.toFixed(1)]);
  return [...forms].filter((f) => f.replace(/[0.]/g, "").length > 0);
}

export function unearnedSecrets(pack: CasePack, state: SessionState, allowPart?: string): string[] {
  const out: string[] = [];
  pack.parts.forEach((part, i) => {
    if (allowPart === part.id) return; // a level-4 nudge may give this part's answer
    const solved = state.numericAttempts.some((a) => a.partId === part.id && a.correct); // the candidate said it first
    const done = state.phase === "ended" || state.phase === "synthesis" || i < state.partIndex || solved;
    if (done) return;
    for (const n of part.expected.numeric) out.push(...numberForms(n.value));
  });
  out.push(...pack.sampleFramework.buckets, pack.sampleFramework.hypothesis, pack.synthesis.recommendation);
  return out;
}

// A model can also leak by guessing: "rent has stayed flat" before the cost
// exhibit is out. Any sentence that pairs a line from an unshown exhibit with a
// trend word or a number is treated as a leak.
const TREND = /\b(flat|rose|risen|grew|grown|fell|fallen|dropped|increased?|decreased?|doubled|tripled|jumped|declined|stayed|remained|higher|lower|up|down|unchanged|stable)\b|\d/i;
const STOPWORDS = new Set(["and", "of", "per", "the", "on", "from", "for", "food", "share", "last", "year", "two", "years", "ago"]);

export function unshownTopics(pack: CasePack, state: SessionState): string[] {
  // Words the candidate already has (the prompt, facts given, exhibits shown) are not secret.
  const known = [
    pack.prompt.readAloud,
    ...state.revealedFacts.map((id) => [...pack.clarifyingFacts, ...pack.parts.flatMap((p) => p.facts)].find((f) => f.id === id)?.answer ?? ""),
    ...pack.exhibits.filter((e) => state.shownExhibits.includes(e.id)).flatMap((e) => [e.title, ...(e.table?.rows.map((r) => String(r[0])) ?? [])]),
  ].join(" ").toLowerCase();
  const topics = new Set<string>();
  for (const ex of pack.exhibits) {
    if (state.shownExhibits.includes(ex.id)) continue;
    for (const row of ex.table?.rows ?? [[ex.title]]) {
      const words = String(row[0]).toLowerCase().match(/[a-z]{4,}/g) ?? [];
      words.filter((w) => !STOPWORDS.has(w)).map((w) => w.replace(/s$/, "")).filter((w) => !known.includes(w)).forEach((w) => topics.add(w));
    }
  }
  return [...topics];
}

export function claimsAboutUnshown(text: string, topics: string[]): string | null {
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const lower = sentence.toLowerCase();
    const topic = topics.find((t) => new RegExp(`\\b${t}`).test(lower));
    if (topic && TREND.test(sentence)) return topic;
  }
  return null;
}

export function leaks(text: string, secrets: string[]): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const s of secrets) {
    const needle = s.toLowerCase();
    if (/^[\d.]+$/.test(needle)) {
      // match the number as a whole token, so "1.5" does not match "11.5"
      const re = new RegExp(`(^|[^\\d.])${needle.replace(".", "\\.")}(?![\\d])`);
      if (re.test(lower)) return s;
    } else if (needle.length > 24 && lower.includes(needle.slice(0, 40))) {
      return s;
    }
  }
  return null;
}
