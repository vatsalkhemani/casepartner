import { z } from "zod";

// Session state travels with the client between turns so the server stays
// stateless. It holds ids and the transcript, never the answer key.

export const Phase = z.enum(["clarifying", "structuring", "structure_review", "part", "synthesis", "ended"]);
export type Phase = z.infer<typeof Phase>;

export const Turn = z.object({
  role: z.enum(["interviewer", "candidate"]),
  text: z.string().max(4000),
  t: z.number(),
  phase: Phase,
  partId: z.string().optional(),
});
export type Turn = z.infer<typeof Turn>;

export const Flag = z.object({
  dimension: z.string(),
  polarity: z.enum(["+", "-"]),
  evidence: z.string().max(600),
  note: z.string().max(400),
  t: z.number(),
});
export type Flag = z.infer<typeof Flag>;

export const SessionState = z.object({
  caseId: z.string(),
  format: z.enum(["candidate_led", "interviewer_led"]),
  phase: Phase,
  partIndex: z.number().int(),
  partAsked: z.boolean(),
  structureProbed: z.boolean(),
  revealedFacts: z.array(z.string()),
  shownExhibits: z.array(z.string()),
  nudges: z.record(z.string(), z.array(z.number().int().min(1).max(4))),
  numericAttempts: z.array(
    z.object({ partId: z.string(), value: z.number(), correct: z.boolean(), errorType: z.string().optional(), t: z.number() }),
  ),
  brainstormPrompts: z.number().int(),
  soWhatAsked: z.array(z.string()).default([]), // parts where Alex already asked "so what?"
  transcript: z.array(Turn).max(400),
  flags: z.array(Flag).max(200),
  startedAt: z.number(),
});
export type SessionState = z.infer<typeof SessionState>;

export function newSession(caseId: string, format: SessionState["format"], now = Date.now()): SessionState {
  return {
    caseId,
    format,
    phase: "clarifying",
    partIndex: -1,
    partAsked: false,
    structureProbed: false,
    revealedFacts: [],
    shownExhibits: [],
    nudges: {},
    numericAttempts: [],
    brainstormPrompts: 0,
    soWhatAsked: [],
    transcript: [],
    flags: [],
    startedAt: now,
  };
}

export function elapsed(state: SessionState, now = Date.now()) {
  return now - state.startedAt;
}
