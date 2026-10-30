import { z } from "zod";
import type { CasePack } from "../case/schema";
import type { SessionState } from "./session";
import type { NumericVerdict } from "./numeric";

// What the director proposes for one candidate turn. The engine applies it
// through the policy, so an over-eager proposal cannot break the reveal rules.

export const Decision = z.object({
  revealFactIds: z.array(z.string()).default([]),
  showExhibit: z.string().nullable().default(null),
  // clarifying: candidate asked for time or gave a structure
  wantsTimeToStructure: z.boolean().default(false),
  gaveStructure: z.boolean().default(false),
  // structure review: probe once for a missing branch
  structureProbe: z.string().nullable().default(null),
  // parts: enough to move on?
  partComplete: z.boolean().default(false),
  // the narrow question: did the candidate answer the question this part asks?
  answeredQuestion: z.boolean().default(false),
  nudgeLevel: z.number().int().min(0).max(4).default(0),
  // math: is the method right, whatever the arithmetic? null = not judged
  approachSound: z.boolean().nullable().default(null),
  // the candidate stated an assumption rather than asking for data
  acceptsAssumption: z.boolean().default(false),
  // "am I on the right track?": is the candidate heading the right way? null = not asked
  onTrack: z.boolean().nullable().default(null),
  // the candidate gave findings or a number but not what it means for the client
  soWhatMissing: z.boolean().default(false),
  // the question can be answered from facts already shared or exhibits already shown
  answerVisible: z.boolean().default(false),
  // a business term the candidate asked about, e.g. "EBITDA" (explained generally, never with case data)
  explainTerm: z.string().max(60).nullable().default(null),
  // candidate is asking for something they cannot have (the answer, a future exhibit)
  deflect: z.boolean().default(false),
  wantsRepeat: z.enum(["none", "prompt", "question"]).default("none"),
  stageDirection: z.string().max(600).default(""),
  flags: z
    .array(z.object({ dimension: z.string(), polarity: z.enum(["+", "-"]), evidence: z.string().max(600), note: z.string().max(400) }))
    .max(4)
    .default([]),
});
export type Decision = z.infer<typeof Decision>;

export type DirectorInput = {
  pack: CasePack;
  state: SessionState;
  text: string;
  numeric: NumericVerdict;
};

export type Director = (input: DirectorInput) => Promise<Decision>;
