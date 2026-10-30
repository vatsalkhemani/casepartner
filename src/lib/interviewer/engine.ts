import type { CasePack, Exhibit } from "../case/schema";
import { Decision, type Director } from "./decision";
import { actorView, templateLine, type ActorView, type Beat } from "./actor";
import { judgeNumbers, type NumericVerdict } from "./numeric";
import { canShowExhibit, currentPart, factById, filterFactIds, matchesAny, nudgeLevelSoFar } from "./policy";
import { leaks, unearnedSecrets } from "./secrets";
import { ruleDirector } from "./ruleDirector";
import { newSession, type SessionState } from "./session";

export type Actor = (view: ActorView) => Promise<string>;
export type Engine = { director: Director; actor?: Actor };

export type TurnEvent =
  | { type: "show_exhibit"; exhibit: Exhibit }
  | { type: "phase"; phase: SessionState["phase"]; partIndex: number }
  | { type: "end" };

export type TurnResult = { state: SessionState; speech: string; events: TurnEvent[]; source: "model" | "rules" };

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
  } else {
    for (const id of filterFactIds(pack, state, decision.revealFactIds)) {
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
        if (decision.wantsTimeToStructure) {
          state.phase = "structuring";
          beats.push({ kind: "allow_time" });
        } else if (decision.gaveStructure) handleStructure();
        else if (!sharedFact) beats.push(QUESTION.test(text.trim()) ? { kind: "no_info" } : { kind: "ack" });
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
        if (decision.showExhibit && state.shownExhibits.includes(decision.showExhibit)) show(decision.showExhibit);

        if (part.kind === "math" && numeric.kind !== "none") {
          state.numericAttempts.push({ partId: part.id, value: numeric.value, correct: numeric.kind === "correct", errorType: numeric.kind === "correct" ? undefined : numeric.kind, t });
          beats.push({ kind: "math_result", result: numeric.kind });
        }
        const mathOpen = part.kind === "math" && numeric.kind !== "correct";
        if (decision.partComplete && !mathOpen) {
          beats.push({ kind: "ack" });
          enterPart(state.partIndex + 1);
        } else if (decision.nudgeLevel > 0) {
          const level = part.kind === "brainstorm" ? 1 : Math.min(4, Math.max(decision.nudgeLevel, nudgeLevelSoFar(state, part.id) + 1));
          recordNudge(part.id, level);
          if (part.kind === "brainstorm") state.brainstormPrompts++;
          // A wrong number already got a probe ("walk me through it"); that is the first rung.
          if (level === 1 && part.kind === "math" && numeric.kind !== "none") break;
          const textFor = { 1: part.nudges.l1, 2: part.nudges.l2, 3: part.nudges.l3, 4: part.nudges.l4 }[level]!;
          beats.push({ kind: "nudge", level, text: textFor });
          if (level === 4) {
            allowPart = part.id;
            enterPart(state.partIndex + 1);
          }
        } else if (!sharedFact) beats.push({ kind: "ack" });
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
  const director = leaks(decision.stageDirection, secrets) ? "" : decision.stageDirection;
  const fallback = templateLine(beats, state.transcript.length);
  let speech = fallback;
  if (engine.actor) {
    try {
      const said = (await engine.actor(actorView(pack, state, beats, director))).trim();
      if (said && !leaks(said, secrets)) speech = said;
    } catch {
      /* the template line stands */
    }
  }

  state.transcript.push({ role: "interviewer", text: speech, t: Date.now() - state.startedAt, phase: state.phase, partId: currentPart(pack, state)?.id });
  return { state, speech, events, source };
}
