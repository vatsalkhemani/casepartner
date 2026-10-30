import type { CasePack, Exhibit } from "../case/schema";
import { Decision, type Director } from "./decision";
import { actorView, templateLine, type ActorView, type Beat } from "./actor";
import { approachFromSteps, judgeNumbers, type NumericVerdict } from "./numeric";
import { canShowExhibit, candidateTurnsInPart, CHECK_IN, currentPart, factById, filterFactIds, GRAB, HINT_ASK, matchesAny, matchFacts, TERM_ASK, TIME_ASK } from "./policy";
import type { Part } from "../case/schema";
import { claimsAboutUnshown, leaks, unearnedSecrets, unshownTopics } from "./secrets";
import { ruleDirector } from "./ruleDirector";
import { newSession, type SessionState } from "./session";

export type Actor = (view: ActorView) => Promise<string>;
// phraseAll: send every turn to the actor model (tests use it to inspect what the actor sees).
export type Engine = { director: Director; actor?: Actor; phraseAll?: boolean };

// Beats that need real language from a model. Everything else (acknowledgements,
// the casebook's own questions, hints and facts, exhibit handoffs) reads well as
// written, and skipping the model there halves the calls and the wait per turn.
const NEEDS_MODEL = new Set<Beat["kind"]>(["answer_visible", "explain_term"]);

export type TurnEvent =
  | { type: "show_exhibit"; exhibit: Exhibit }
  | { type: "phase"; phase: SessionState["phase"]; partIndex: number }
  | { type: "end" };

export type TurnResult = { state: SessionState; speech: string; events: TurnEvent[]; source: "model" | "rules" };

// How real casers escalate: a probe, then direction, then give it and move on.
// Math gets a specific hint before the answer. Nobody is held on a part long.
const LADDER: Record<Part["kind"], number[]> = { exhibit: [1, 2, 4], qualitative: [1, 2, 4], math: [1, 3, 4], brainstorm: [1, 1] };
const MAX_TURNS_IN_PART = 4;
const ASSUMES = /\b(assume|assuming|let's say|let us say|i'll say|ballpark|roughly estimate)\b/i;

function nextRung(part: Part, given: number[]): number {
  const seq = LADDER[part.kind];
  return given.length >= seq.length ? 4 : seq[given.length];
}

const QUESTION = /\?|^(what|how|why|do|does|did|is|are|can|could|would|should|where|when|who|any)\b/i;

export function startSession(pack: CasePack, format: SessionState["format"], now = Date.now()): TurnResult {
  const state = newSession(pack.id, format, now);
  const upfront = pack.clarifyingFacts.filter((f) => f.volunteerUpfront || format === "interviewer_led" && f.id === "goal");
  state.revealedFacts = upfront.map((f) => f.id);
  const speech = [
    "Hi, I'm Alex. Thanks for making the time. Let's go straight into the case.",
    pack.prompt.readAloud,
    ...upfront.map((f) => f.answer),
    format === "candidate_led" ? "Take it from here." : "Before you structure it, any clarifying questions?",
  ].join(" ");
  state.transcript.push({ role: "interviewer", text: speech, t: 0, phase: "clarifying" });
  return { state, speech, events: [{ type: "phase", phase: "clarifying", partIndex: -1 }], source: "rules" };
}

export async function runTurn(pack: CasePack, prev: SessionState, text: string, engine: Engine, now = Date.now()): Promise<TurnResult> {
  const state: SessionState = structuredClone(prev);
  const t = now - state.startedAt;
  const partAtStart = currentPart(pack, state);
  state.transcript.push({ role: "candidate", text, t, phase: state.phase, partId: partAtStart?.id });

  const numeric: NumericVerdict = partAtStart?.kind === "math" ? judgeNumbers(text, partAtStart.expected.numeric) : { kind: "none" };

  let decision: Decision;
  let source: TurnResult["source"] = "model";
  try {
    decision = await engine.director({ pack, state, text, numeric });
  } catch {
    decision = await ruleDirector({ pack, state, text, numeric });
    source = "rules";
  }
  if (engine.director === ruleDirector) source = "rules";

  // Guards that hold whatever the director proposes. A model can misread a
  // turn; the case still has to behave like a real one.
  if (GRAB.test(text)) decision.deflect = true;
  if (decision.explainTerm && !text.toLowerCase().includes(decision.explainTerm.toLowerCase())) decision.explainTerm = null;
  if (!decision.explainTerm && !decision.deflect) {
    const m = text.match(TERM_ASK);
    const term = m && (m[4] ?? m[6] ?? m[7])?.trim();
    // "what is the goal?" is a clarifying question, not jargon
    if (term && term.split(/\s+/).length <= 4 && !/^(the|our|their|your|this|that|it|we|they|you)\b/i.test(term)) decision.explainTerm = term;
  }
  if (decision.wantsTimeToStructure && !TIME_ASK.test(text)) decision.wantsTimeToStructure = false;
  if (state.phase === "structuring") {
    const tries = state.transcript.filter((x) => x.role === "candidate" && x.phase === "structuring").length;
    const words = text.trim().split(/\s+/).length;
    if (tries >= 2 && words >= 3) decision.gaveStructure = true; // take a weak structure; the score reflects it
  }

  const beats: Beat[] = [];
  const events: TurnEvent[] = [];
  let allowPart: string | undefined;
  const phaseBefore = state.phase;

  const show = (ex: string) => {
    const exhibit = pack.exhibits.find((e) => e.id === ex);
    if (!exhibit || !canShowExhibit(pack, state, ex)) return;
    if (!state.shownExhibits.includes(ex)) state.shownExhibits.push(ex);
    beats.push({ kind: "handoff", label: exhibit.label, title: exhibit.title });
    events.push({ type: "show_exhibit", exhibit });
  };

  const enterPart = (i: number, fromText?: string) => {
    if (i >= pack.parts.length) {
      state.phase = "synthesis";
      state.partIndex = pack.parts.length;
      beats.push({ kind: "ask", text: pack.synthesis.question });
      return;
    }
    state.phase = "part";
    state.partIndex = i;
    state.partAsked = false;
    const part = pack.parts[i];
    const candidateMustAsk = state.format === "candidate_led" && part.kind === "exhibit";
    if (candidateMustAsk && !(fromText && matchesAny(fromText, part.unlockKeywords))) {
      beats.push({ kind: "ask", text: i === 0 ? "Sounds good. Where would you like to start?" : "Good. What would you want to look at next?" });
      return;
    }
    part.exhibits.forEach(show);
    beats.push({ kind: "ask", text: part.question });
    state.partAsked = true;
  };

  const recordNudge = (partId: string, level: number) => {
    (state.nudges[partId] ??= []).push(level);
  };

  const handleStructure = () => {
    if (decision.structureProbe && !state.structureProbed) {
      state.structureProbed = true;
      state.phase = "structure_review";
      beats.push({ kind: "ack" }, { kind: "probe", text: decision.structureProbe });
    } else {
      beats.push({ kind: "ack" });
      enterPart(0, text);
    }
  };

  if (decision.wantsRepeat !== "none") {
    const part = currentPart(pack, state);
    beats.push({ kind: "repeat", text: decision.wantsRepeat === "question" && part ? part.question : pack.prompt.readAloud });
  } else if (decision.deflect) {
    beats.push({ kind: "deflect" });
  } else if (decision.explainTerm && !matchFacts(pack, state, text).length) {
    beats.push({ kind: "explain_term", term: decision.explainTerm });
  } else if (CHECK_IN.test(text) && state.phase === "part" && state.partAsked) {
    // An honest signal, as a caser gives one: on track, or the next hint.
    const part = currentPart(pack, state)!;
    const onTrack = decision.onTrack ?? (state.nudges[part.id] ?? []).length === 0;
    if (onTrack) beats.push({ kind: "on_track" });
    else {
      const level = nextRung(part, state.nudges[part.id] ?? []);
      recordNudge(part.id, level);
      beats.push({ kind: "nudge", level, text: { 1: part.nudges.l1, 2: part.nudges.l2, 3: part.nudges.l3, 4: part.nudges.l4 }[level]! });
      if (level === 4) {
        allowPart = part.id;
        enterPart(state.partIndex + 1);
      }
    }
  } else if (HINT_ASK.test(text) && (state.phase === "structuring" || state.phase === "clarifying") && !decision.gaveStructure) {
    // Stuck on the structure: point at the shape of the problem, not the answer.
    beats.push({ kind: "probe", text: `Think about what drives the answer here. What are the two or three things ${pack.client} would need to be true?` });
  } else if (decision.answerVisible && !matchFacts(pack, state, text).length && state.phase === "part" && !HINT_ASK.test(text)) {
    beats.push({ kind: "answer_visible" });
  } else {
    // Facts answer questions, and only the facts the question is about. Live
    // runs showed the model handing over geography for "should they raise
    // prices?", so the match is done by the case pack's keywords, not the model.
    const asked = QUESTION.test(text.trim()) || /\?/.test(text);
    const matched = asked ? matchFacts(pack, state, text).map((f) => f.id) : [];
    const fresh = matched.filter((id) => !state.revealedFacts.includes(id));
    // Repeat an answer only when asked to; otherwise a matched-but-known fact is skipped.
    const wantsAgain = /\b(again|repeat|remind me)\b/i.test(text);
    const toReveal = filterFactIds(pack, state, fresh.length ? fresh : wantsAgain ? matched : []).slice(0, 2);
    for (const id of toReveal) {
      const fact = factById(pack, id);
      if (!fact) continue;
      beats.push({ kind: "fact", text: fact.answer });
      if (!state.revealedFacts.includes(id)) state.revealedFacts.push(id);
    }
    const sharedFact = beats.length > 0;

    const overTime = t > (pack.meta.minutes + 5) * 60_000;
    if (overTime && state.phase === "part") {
      beats.push({ kind: "ask", text: "We're running short on time, so let's jump to the end." });
      enterPart(pack.parts.length);
    } else switch (state.phase) {
      case "clarifying":
        if (!sharedFact && (decision.acceptsAssumption || ASSUMES.test(text)) && !decision.gaveStructure && !decision.wantsTimeToStructure) {
          beats.push({ kind: "accept_assumption" });
        } else if (decision.wantsTimeToStructure) {
          state.phase = "structuring";
          beats.push({ kind: "allow_time" });
        } else if (decision.gaveStructure) handleStructure();
        else if (state.transcript.filter((x) => x.role === "candidate" && x.phase === "clarifying").length >= 5) {
          // A caser does not let the opening run forever: prompt for the structure.
          state.phase = "structuring";
          beats.push({ kind: "ask", text: "Good questions. How would you like to structure this?" });
        } else if (!sharedFact) beats.push(QUESTION.test(text.trim()) ? { kind: "no_info" } : { kind: "ack" });
        break;

      case "structuring":
        if (decision.gaveStructure) handleStructure();
        else if (!sharedFact) beats.push({ kind: "ready_when_you_are" });
        break;

      case "structure_review":
        beats.push({ kind: "ack" });
        enterPart(0, text);
        break;

      case "part": {
        const part = currentPart(pack, state)!;
        const exhibitPending = part.exhibits.find((e) => !state.shownExhibits.includes(e));

        if (!state.partAsked && exhibitPending && decision.showExhibit === exhibitPending) {
          if (!matchesAny(text, part.unlockKeywords)) beats.push({ kind: "steer" });
          show(exhibitPending);
          beats.push({ kind: "ask", text: part.question });
          state.partAsked = true;
          break;
        }
        if (!state.partAsked) {
          // waiting for the candidate to ask for this part's data
          if (!sharedFact) beats.push({ kind: "ack" });
          break;
        }
        if (decision.showExhibit && state.shownExhibits.includes(decision.showExhibit) && /\b(again|back|see (it|that|exhibit)|show (me )?(it|that|exhibit))\b/i.test(text)) show(decision.showExhibit);

        // Math: approach first. A right method with a slip in the arithmetic is
        // acknowledged and the case moves on, the way a real caser does it.
        let mathDone = false;
        if (part.kind === "math" && numeric.kind !== "none") {
          const sound = numeric.kind === "wrong" && (decision.approachSound ?? approachFromSteps(text, numeric.answer));
          state.numericAttempts.push({ partId: part.id, value: numeric.value, correct: numeric.kind === "correct", errorType: numeric.kind === "correct" ? undefined : sound ? "arithmetic" : numeric.kind, t });
          if (numeric.kind === "correct") {
            beats.push({ kind: "math_result", result: "correct" });
            mathDone = true;
          } else if (sound) {
            beats.push({ kind: "close_enough", value: `${numeric.answer.value.toFixed(1)} ${numeric.answer.unit.replace("$M", "million")}` });
            allowPart = part.id;
            mathDone = true;
          } else {
            beats.push({ kind: "math_result", result: numeric.kind });
          }
        }

        if (HINT_ASK.test(text) && !decision.nudgeLevel) decision.nudgeLevel = 1;
        // Findings with no "so what": ask once before moving on, as a caser would.
        if (decision.partComplete && decision.soWhatMissing && !state.soWhatAsked.includes(part.id) && part.kind !== "brainstorm" && !mathDone) {
          state.soWhatAsked.push(part.id);
          beats.push({ kind: "so_what", client: pack.client });
          break;
        }
        const given = state.nudges[part.id] ?? [];
        const stalled = candidateTurnsInPart(state, part.id) >= MAX_TURNS_IN_PART;
        const brainstormDone = part.kind === "brainstorm" && state.brainstormPrompts >= LADDER.brainstorm.length;
        const complete = mathDone || brainstormDone || (decision.partComplete && part.kind !== "math");

        if (complete) {
          if (!mathDone) beats.push({ kind: "ack" });
          enterPart(state.partIndex + 1);
        } else if (decision.nudgeLevel > 0 || stalled || (part.kind === "math" && numeric.kind !== "none")) {
          const level = stalled ? 4 : nextRung(part, given);
          recordNudge(part.id, level);
          if (part.kind === "brainstorm") state.brainstormPrompts++;
          // a wrong number already got its probe ("walk me through it"): that is rung one
          if (!(level === 1 && part.kind === "math" && numeric.kind !== "none")) {
            const textFor = { 1: part.nudges.l1, 2: part.nudges.l2, 3: part.nudges.l3, 4: part.nudges.l4 }[level]!;
            beats.push({ kind: "nudge", level, text: textFor });
          }
          if (level === 4) {
            // give it, then keep the case moving: the next part (and its exhibit) comes now
            allowPart = part.id;
            enterPart(state.partIndex + 1);
          }
        } else if (!sharedFact) beats.push(decision.acceptsAssumption || ASSUMES.test(text) ? { kind: "accept_assumption" } : { kind: "ack" });
        break;
      }

      case "synthesis":
        state.phase = "ended";
        beats.push({ kind: "close" });
        events.push({ type: "end" });
        break;

      case "ended":
        beats.push({ kind: "close" });
        events.push({ type: "end" });
        break;
    }
  }

  for (const f of decision.flags) state.flags.push({ ...f, t });
  if (state.phase !== phaseBefore || events.some((e) => e.type === "show_exhibit")) {
    events.unshift({ type: "phase", phase: state.phase, partIndex: state.partIndex });
  }

  // Speak. Anything a model wrote is checked for unearned answers first; the
  // template line is safe by construction.
  const secrets = unearnedSecrets(pack, state, allowPart);
  // The director's free text never reaches the actor: on 2026-10-29 it carried
  // exhibit data ("rent is flat") into speech before the exhibit was shown.
  const director = "";
  const fallback = templateLine(beats, state.transcript.length);
  let speech = fallback;
  if (engine.actor && (engine.phraseAll || beats.some((b) => NEEDS_MODEL.has(b.kind)))) {
    try {
      const said = (await engine.actor(actorView(pack, state, beats, director))).replace(/\s*\n+\s*/g, " ").trim();
      if (said && !leaks(said, secrets) && !claimsAboutUnshown(said, unshownTopics(pack, state))) speech = said;
    } catch {
      /* the template line stands */
    }
  }

  state.transcript.push({ role: "interviewer", text: speech, t: Date.now() - state.startedAt, phase: state.phase, partId: currentPart(pack, state)?.id });
  return { state, speech, events, source };
}
