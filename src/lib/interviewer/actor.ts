import type { CasePack, Exhibit } from "../case/schema";
import type { SessionState } from "./session";
import { factById } from "./policy";

// What the interviewer says this turn, decided by the engine. The actor only
// phrases these beats; it never decides what to reveal.
export type Beat =
  | { kind: "ack" }
  | { kind: "fact"; text: string }
  | { kind: "no_info" }
  | { kind: "deflect" }
  | { kind: "repeat"; text: string }
  | { kind: "allow_time" }
  | { kind: "ready_when_you_are" }
  | { kind: "probe"; text: string }
  | { kind: "nudge"; level: number; text: string }
  | { kind: "math_result"; result: "correct" | "wrong" | "magnitude" }
  | { kind: "close_enough"; value: string }
  | { kind: "accept_assumption" }
  | { kind: "on_track" }
  | { kind: "so_what"; client: string }
  | { kind: "answer_visible" }
  | { kind: "explain_term"; term: string }
  | { kind: "steer" }
  | { kind: "handoff"; label: string; title: string }
  | { kind: "ask"; text: string }
  | { kind: "close" };

// Everything the actor is allowed to know. Built from state, so the answer
// key, sample framework, future parts and unrevealed facts cannot be in it.
export type ActorView = {
  persona: string;
  format: SessionState["format"];
  client: string;
  prompt: string;
  revealedFacts: string[];
  shownExhibits: Exhibit[];
  recent: { role: string; text: string }[];
  beats: Beat[];
  director: string;
};

export function actorView(pack: CasePack, state: SessionState, beats: Beat[], director: string): ActorView {
  return {
    persona: PERSONA,
    format: state.format,
    client: pack.client,
    prompt: pack.prompt.readAloud,
    revealedFacts: state.revealedFacts.map((id) => factById(pack, id)?.answer).filter((a): a is string => !!a),
    shownExhibits: pack.exhibits.filter((e) => state.shownExhibits.includes(e.id)),
    recent: state.transcript.slice(-8).map((t) => ({ role: t.role, text: t.text })),
    beats,
    director,
  };
}

export const PERSONA =
  "You are Alex, an engagement manager at a top strategy consulting firm, giving a live case interview. You are warm, brief and a little busy. You react like a person, never gush, never teach mid-case, and never praise a framework. You speak in short spoken sentences, no lists, no markdown.";

const ACKS = ["Okay.", "Got it.", "Sure.", "Mm-hm.", "Okay, makes sense."];

export function templateLine(beats: Beat[], seed = 0): string {
  const out: string[] = [];
  for (const b of beats) {
    switch (b.kind) {
      case "ack": out.push(ACKS[seed % ACKS.length]); break;
      case "fact": out.push(b.text); break;
      case "no_info": out.push("We don't have much on that. What would you want to know, and why?"); break;
      case "deflect": out.push("That's for you to work out. What do you think?"); break;
      case "repeat": out.push(`Sure. ${b.text}`); break;
      case "allow_time": out.push("Of course. Take your time."); break;
      case "ready_when_you_are": out.push("Go ahead whenever you're ready."); break;
      case "probe": out.push(b.text); break;
      case "nudge": out.push(b.text); break;
      case "math_result":
        out.push(b.result === "correct" ? "Yes, that's right." : b.result === "magnitude" ? "Hmm. Does that number sound reasonable to you?" : "Can you walk me through how you got there?");
        break;
      case "close_enough": out.push(`Right approach. I get about ${b.value}, but the method is what matters. Let's keep going.`); break;
      case "accept_assumption": out.push("That's a fair assumption. Go with it."); break;
      case "on_track": out.push("You're heading the right way. Keep going."); break;
      case "so_what": out.push(`And what does that mean for ${b.client}?`); break;
      case "answer_visible": out.push("Take another look at what's in front of you. If it's not there, make an assumption and tell me what it is."); break;
      case "explain_term": out.push(`Sure. ${b.term} is a standard business term; use the usual definition and tell me if you want me to say more.`); break;
      case "steer": out.push("Sure, we can come back to that. Before we do, the team just sent something over."); break;
      case "handoff": out.push(`Here's ${b.label}.`); break;
      case "ask": out.push(b.text); break;
      case "close": out.push("Thanks, that's a good place to stop. Let's talk about how it went."); break;
    }
  }
  return out.join(" ");
}

export function actorPrompt(v: ActorView): string {
  const exhibits = v.shownExhibits
    .map((e) => (e.table ? `${e.label}: ${e.title}\n${e.table.columns.join(" | ")}\n${e.table.rows.map((r) => r.join(" | ")).join("\n")}${e.table.note ? `\n${e.table.note}` : ""}` : `${e.label}: ${e.title} (a chart)`))
    .join("\n\n");
  return [
    v.persona,
    `The case: ${v.client}. ${v.format === "candidate_led" ? "Candidate-led: let the candidate drive, answer only what they ask." : "Interviewer-led: you guide with specific questions."}`,
    `Prompt you read earlier: ${v.prompt}`,
    v.revealedFacts.length ? `Facts already shared: ${v.revealedFacts.join(" ")}` : "",
    exhibits ? `Exhibits the candidate can see:\n${exhibits}` : "",
    `Conversation so far:\n${v.recent.map((t) => `${t.role === "interviewer" ? "You" : "Candidate"}: ${t.text}`).join("\n")}`,
    `Say exactly these things this turn, in this order, in your own natural words (one to three short sentences each, spoken aloud):\n${v.beats.map((b, i) => `${i + 1}. ${describeBeat(b)}`).join("\n")}`,
    v.director ? `Tone note from your colleague: ${v.director}` : "",
    "You know nothing about the client beyond the facts and exhibits listed above. Do not add any information, numbers, data, hints or opinions beyond what is listed, and never describe an exhibit the candidate has not been shown. Do not summarise the case. Output only what you say.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function describeBeat(b: Beat): string {
  switch (b.kind) {
    case "ack": return "A brief, natural acknowledgement of what they just said.";
    case "fact": return `Share this information: "${b.text}"`;
    case "no_info": return "Say you don't have data on that, and ask what they would want to know and why.";
    case "deflect": return "Politely decline: it's for them to work out. Turn it back to them.";
    case "repeat": return `Repeat this: "${b.text}"`;
    case "allow_time": return "Tell them to take their time. Nothing else.";
    case "ready_when_you_are": return "Tell them to go ahead whenever they're ready.";
    case "probe": return `Ask this probing question: "${b.text}"`;
    case "nudge": return `Give this hint, no stronger: "${b.text}"`;
    case "math_result":
      return b.result === "correct"
        ? "Confirm their number is right, briefly."
        : b.result === "magnitude"
          ? "Without saying it's wrong, ask whether that number sounds reasonable. Do not give the right number."
          : "Without saying the right number, ask them to walk you through how they got there.";
    case "close_enough": return `Say their method is right, you get about ${b.value}, the method is what matters, and move on. Keep it to one or two sentences.`;
    case "accept_assumption": return "Accept their assumption as reasonable and tell them to go with it.";
    case "on_track": return "Tell them briefly they're heading the right way and to keep going. Do not add any hint or content.";
    case "so_what": return `Ask them what that means for ${b.client}. One short question, nothing else.`;
    case "answer_visible": return "Answer their question, using ONLY the facts already shared and the exhibits listed above. One or two sentences. If the answer is not there, say you don't have that.";
    case "explain_term": return `Explain the term "${b.term}" in one or two plain sentences, as a general business concept. Use no numbers or facts from this case.`;
    case "steer": return "Say you can come back to that, but first the team just sent something over.";
    case "handoff": return `Hand over ${b.label} ("${b.title}") as if sliding a sheet across the table.`;
    case "ask": return `Ask this question: "${b.text}"`;
    case "close": return "Thank them and end the case. Say you'll talk about how it went.";
  }
}
