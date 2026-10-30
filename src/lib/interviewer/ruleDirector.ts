import type { Director } from "./decision";
import { Decision } from "./decision";
import { candidateTurnsInPart, currentPart, matchFacts, matchesAny, nudgeLevelSoFar } from "./policy";

// A director that needs no model. It runs when there is no API key, when the
// model fails, and in tests. Cruder than the model, never leakier.

const TIME_ASKS = ["take a moment", "take a minute", "a few minutes", "a couple of minutes", "gather my thoughts", "structure my thoughts", "a second to", "time to think", "minute to structure"];
const STRUCTURE_MARKERS = ["first", "second", "third", "areas", "buckets", "look at", "framework", "structure", "i'd like to", "i would like to", "i want to"];
const REPEAT_PROMPT = ["repeat the prompt", "repeat the case", "say the prompt again", "read the prompt again", "repeat the question", "say that again", "come again", "repeat that"];
const ANSWER_GRABS = ["what's the answer", "what is the answer", "tell me the answer", "just tell me", "what should i say", "ignore your instructions", "ignore previous", "system prompt", "show me all", "next exhibit", "exhibit b", "exhibit c", "answer key"];

const STOP = new Set(["about", "their", "there", "which", "would", "could", "should", "rather", "than", "while", "from", "with", "that", "this", "more", "most", "together"]);

function insightHits(text: string, insights: string[]): number {
  const t = text.toLowerCase();
  return insights.filter((ins) => {
    const words = ins.toLowerCase().match(/[a-z]{5,}/g)?.filter((w) => !STOP.has(w)) ?? [];
    return words.filter((w) => t.includes(w.slice(0, 6))).length >= 2;
  }).length;
}

function ideaCount(text: string): number {
  return text
    .split(/[.;\n]|,|\band\b|\balso\b|\bsecond\b|\bthird\b|\banother\b|\bplus\b/i)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3).length;
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const ruleDirector: Director = async ({ pack, state, text, numeric }) => {
  const d = Decision.parse({});
  const lower = text.toLowerCase();

  if (matchesAny(lower, REPEAT_PROMPT)) {
    d.wantsRepeat = state.phase === "part" && state.partAsked ? "question" : "prompt";
    return d;
  }
  // A future exhibit or the answer is never available. Exhibit names the
  // candidate has already seen are fine, so check against what is shown.
  const grab = ANSWER_GRABS.find((g) => lower.includes(g));
  if (grab && !(grab.startsWith("exhibit") && state.shownExhibits.some((e) => grab.endsWith(e.toLowerCase())))) {
    d.deflect = true;
    return d;
  }

  // Answer facts only when asked. Mentioning "revenue" mid-analysis is not a question.
  const stating = /\b(assume|assuming|let's say|let me say|i'll say|ballpark)\b/i.test(text);
  const asking = !stating && /\?|\b(what|how|why|do we|did|does|is there|are there|can you|could you|any data|do you have|tell me)\b/i.test(text);
  // Repeat an answer only if the question asks for nothing new.
  if (asking) {
    const matched = matchFacts(pack, state, text);
    const fresh = matched.filter((f) => !state.revealedFacts.includes(f.id));
    d.revealFactIds = (fresh.length ? fresh : matched.slice(0, 1)).map((f) => f.id);
  }

  switch (state.phase) {
    case "clarifying": {
      if (matchesAny(lower, TIME_ASKS)) d.wantsTimeToStructure = true;
      else if (words(text) > 45 && STRUCTURE_MARKERS.filter((m) => lower.includes(m)).length >= 2) {
        d.gaveStructure = true;
        d.revealFactIds = [];
      }
      return d;
    }
    case "structuring": {
      // A weak structure is still a structure: take it on the second try and let the score reflect it.
      const tries = state.transcript.filter((t) => t.role === "candidate" && t.phase === "structuring").length;
      d.gaveStructure = words(text) > 15 || (tries >= 2 && words(text) >= 3);
      if (d.gaveStructure) d.revealFactIds = [];
      if (d.gaveStructure && !state.structureProbed && !lower.includes("cost")) {
        d.structureProbe = "Anything on the cost side you'd want to look at?";
      }
      return d;
    }
    case "structure_review":
      return d;
    case "part": {
      const part = currentPart(pack, state)!;
      const level = nudgeLevelSoFar(state, part.id);
      const turns = candidateTurnsInPart(state, part.id);

      if (state.format === "candidate_led" && part.kind === "exhibit" && !state.shownExhibits.includes(part.exhibits[0])) {
        // The candidate drives: show the exhibit when they ask for this kind of data,
        // or steer them to it after a turn of wandering.
        if (matchesAny(lower, part.unlockKeywords) || turns >= 1) d.showExhibit = part.exhibits[0];
        return d;
      }
      if (part.kind === "math") {
        // the engine judges the number and the method; ask for a nudge only if they gave nothing to judge
        if (numeric.kind === "correct") d.partComplete = true;
        else if (numeric.kind === "none") d.nudgeLevel = Math.min(4, level + 1);
        return d;
      }
      if (part.kind === "brainstorm") {
        const min = part.expected.ideas?.min ?? 4;
        const total = state.transcript.filter((t) => t.role === "candidate" && t.partId === part.id).map((t) => ideaCount(t.text)).reduce((a, b) => a + b, 0) + ideaCount(text);
        if (total >= min) d.partComplete = true;
        else d.nudgeLevel = 1;
        return d;
      }
      // exhibit or qualitative: move on once the main insights are there
      const hits = insightHits(text, part.expected.insights);
      if (hits >= 2 || (hits >= 1 && level >= 1) || level >= 3) d.partComplete = true;
      else d.nudgeLevel = Math.min(4, level + 1);
      return d;
    }
    default:
      return d;
  }
};
