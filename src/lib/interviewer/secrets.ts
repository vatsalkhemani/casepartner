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
