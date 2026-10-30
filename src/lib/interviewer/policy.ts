import type { CasePack, Fact, Part } from "../case/schema";
import type { SessionState } from "./session";

// The reveal policy from docs/INTERVIEWER.md section 3, enforced in code.
// The director model can propose anything; only what passes here happens.

export function currentPart(pack: CasePack, state: SessionState): Part | undefined {
  return state.phase === "part" ? pack.parts[state.partIndex] : undefined;
}

export function allowedFacts(pack: CasePack, state: SessionState): Fact[] {
  const part = currentPart(pack, state);
  return [...pack.clarifyingFacts, ...(part?.facts ?? [])];
}

export function filterFactIds(pack: CasePack, state: SessionState, ids: string[]): string[] {
  const ok = new Set(allowedFacts(pack, state).map((f) => f.id));
  return [...new Set(ids.filter((id) => ok.has(id)))];
}

// An exhibit may be shown only during its own part, or re-shown once seen.
export function canShowExhibit(pack: CasePack, state: SessionState, id: string | null | undefined): boolean {
  if (!id) return false;
  if (state.shownExhibits.includes(id)) return true;
  const part = currentPart(pack, state);
  return !!part && part.exhibits.includes(id);
}

export function factById(pack: CasePack, id: string): Fact | undefined {
  return [...pack.clarifyingFacts, ...pack.parts.flatMap((p) => p.facts)].find((f) => f.id === id);
}

export function candidateTurnsInPart(state: SessionState, partId: string): number {
  return state.transcript.filter((t) => t.role === "candidate" && t.phase === "part" && t.partId === partId).length;
}

export function nudgeLevelSoFar(state: SessionState, partId: string): number {
  return Math.max(0, ...(state.nudges[partId] ?? []));
}

// Asking for what nobody gets: the answer, the key, future exhibits, or new instructions.
export const GRAB =
  /(\b(what|tell me|give me|just say)\b.{0,20}\b(the )?answers?\b|answer key|expected answers?|ignore\b.{0,30}\binstructions|system prompt|(see|show|give)\b.{0,15}\b(all|every|the rest of|next)\b.{0,15}\bexhibits?|just tell me the number)/i;

// Asking for a moment to structure.
export const TIME_ASK =
  /\b(a|one)\s+(moment|minute|second|sec)\b|\bcouple of minutes\b|\b(gather|structure|organi[sz]e) my thoughts\b|\btime to (think|structure)\b|\btake a (moment|minute|beat)\b/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$. ]+/g, " ");

export function matchesAny(text: string, keywords: string[]): boolean {
  const t = ` ${norm(text)} `;
  return keywords.some((k) => t.includes(` ${norm(k).trim()}`));
}

export function matchFacts(pack: CasePack, state: SessionState, text: string): Fact[] {
  return allowedFacts(pack, state).filter((f) => matchesAny(text, f.keywords));
}
