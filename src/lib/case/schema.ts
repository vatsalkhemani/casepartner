import { z } from "zod";

// The case pack is the contract between compiler, director, actor and evals.
// See docs/CASE-PACK.md. Anything the candidate must earn lives here and only
// reaches the actor through actorView().

export const Table = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))),
  unit: z.string().optional(),
  note: z.string().optional(),
});
export type Table = z.infer<typeof Table>;

export const Exhibit = z.object({
  id: z.string(),
  label: z.string(), // "Exhibit A"
  title: z.string(),
  table: Table,
  source: z.string().optional(),
});
export type Exhibit = z.infer<typeof Exhibit>;

export const Fact = z.object({
  id: z.string(),
  topic: z.string(),
  keywords: z.array(z.string()),
  answer: z.string(),
  volunteerUpfront: z.boolean().default(false),
});
export type Fact = z.infer<typeof Fact>;

export const NumericAnswer = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  tolerancePct: z.number(),
  steps: z.array(z.string()),
});
export type NumericAnswer = z.infer<typeof NumericAnswer>;

export const Part = z.object({
  id: z.string(),
  kind: z.enum(["exhibit", "math", "brainstorm", "qualitative"]),
  question: z.string(),
  unlockKeywords: z.array(z.string()),
  exhibits: z.array(z.string()),
  facts: z.array(Fact),
  expected: z.object({
    insights: z.array(z.string()).default([]),
    numeric: z.array(NumericAnswer).default([]),
    ideas: z
      .object({ examples: z.array(z.string()), min: z.number(), standout: z.number() })
      .optional(),
  }),
  checks: z.array(z.string()),
  nudges: z.object({ l1: z.string(), l2: z.string(), l3: z.string(), l4: z.string() }),
  commonMistakes: z.array(z.object({ pattern: z.string(), probe: z.string() })),
});
export type Part = z.infer<typeof Part>;

export const CasePack = z.object({
  id: z.string(),
  title: z.string(),
  version: z.number(),
  source: z.object({ kind: z.enum(["original", "upload"]), book: z.string().optional(), notice: z.string().optional() }),
  meta: z.object({
    formats: z.array(z.enum(["interviewer_led", "candidate_led"])),
    type: z.string(),
    industry: z.string(),
    difficulty: z.number().min(1).max(3),
    stretchArea: z.string(),
    minutes: z.number(),
  }),
  client: z.string(),
  prompt: z.object({ readAloud: z.string(), objective: z.string() }),
  clarifyingFacts: z.array(Fact),
  opening: z.object({ expectedClarifiers: z.array(z.string()) }),
  sampleFramework: z.object({ buckets: z.array(z.string()), hypothesis: z.string() }),
  parts: z.array(Part).min(1),
  synthesis: z.object({
    question: z.string(),
    recommendation: z.string(),
    reasons: z.array(z.string()),
    risks: z.array(z.string()),
    nextSteps: z.array(z.string()),
  }),
  exhibits: z.array(Exhibit),
  interviewerNotes: z.array(z.string()),
});
export type CasePack = z.infer<typeof CasePack>;
