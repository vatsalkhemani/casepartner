# Case Partner: the master plan

Working name. Naming options are at the end.

> An AI interviewer that runs a consulting case the way a good second-year does: it reads you the prompt, holds back the data until you earn it, slides the exhibit across the table at the right moment, nudges you when you are lost, probes when your math is off, and tells you at the end whether you would have advanced. And it proves its scoring agrees with human casers.

This file is the navigator. Detail lives in:

| File | What it holds |
|---|---|
| [RESEARCH.md](RESEARCH.md) | How cases are built and judged, firm formats, the competitive landscape, voice and avatar options with prices and sources |
| [INTERVIEWER.md](INTERVIEWER.md) | The interviewer's brain: the director/actor split, reveal policy, nudge ladder, mistake diagnosis, scoring |
| [CASE-PACK.md](CASE-PACK.md) | The compiled case format, the compiler pipeline, and the content rules |
| [DESIGN.md](DESIGN.md) | The look, the screens, the signature moments, and how each design skill is used |
| [EVALS.md](EVALS.md) | How we prove it works, and what "replaces a human caser" has to mean in numbers |

---

## 1. The outcome

**A candidate should be able to do with this everything they do with a human caser, and walk away with feedback at least as useful.** Concretely, a session has to reproduce the five building blocks every casebook teaches (prompt and clarifying questions, structure, exhibits and math, brainstorming, recommendation) with the same information asymmetry a real interviewer keeps.

"Replace a human caser" is a claim we earn with evidence, not with copy. The evidence is [EVALS.md](EVALS.md) section E5: scored sessions that a second-year or case parent also scored, and the agreement between the two.

## 2. The honest competitive read

This idea is not new. At least eight AI case tools exist (full scan in [RESEARCH.md](RESEARCH.md#4-the-competitive-landscape)). The closest is **CaseRound**: upload your casebook PDF, practice it as a live voice interview, interviewer-led or candidate-led, scored on eight dimensions, $39/month. Wharton students also get **RocketBlocks and CaseCoach free through school**, and RocketBlocks already offers AI cases.

So "an AI that cases you" is table stakes. What none of them show, from their own pages:

1. **Scoring that is measured against humans.** Nobody publishes how often their score matches a real caser's. This is the one thing a serious reader stops for, and it is Vatsal's own eval method (error analysis first, binary judges, judges validated by TPR/TNR, a cross-family judge).
2. **An interviewer who has given this case a thousand times.** RocketBlocks' own advice is that a partner who gives the same case 10 to 15 times gives far better feedback ("you're the fastest math responder I've seen"). Software can do that at scale: "on this case, the median candidate needed two nudges on the math; you needed none."
3. **Respect for casebook terms.** Darden's casebook forbids feeding it into generative AI tools. A tool that detects and honours that is the one a consulting club could actually endorse.
4. **A room that feels like a room.** Exhibits that appear when earned and never before, a notepad, no calculator, silence that is allowed to happen, and an interviewer with presence. Every competitor page describes the features. None shows the moment.

**The bet:** win the Wharton consulting club first (case families, second-years, the 50 casebooks already on Campus Groups), with a tool that is free to use and honest about its accuracy.

## 3. Principles

- **The interviewer never knows more than it should say.** The answer key lives in a separate process from the voice. See [INTERVIEWER.md](INTERVIEWER.md#1-the-split-director-and-actor).
- **Feedback is evidence, not adjectives.** Every judgement points to a timestamped moment in the transcript.
- **Three-level verdicts, like the firms.** Firms rate "not good enough, good enough, standout", not percentages (RocketBlocks, WCC kickoff, 2026-09-11). We do the same.
- **No invented targets.** Accuracy targets get set after the first error analysis, not before.
- **Free to use.** F-1 rules out revenue anyway. Default on free tiers, and users bring their own keys for premium voice and avatar.
- **Casebook content never enters the repo.** Uploaded and derived case packs live in private user storage. The repo only ships original cases.

## 4. What it does: the session

1. **Pick or upload a case.** Library of original cases, or upload a casebook PDF. The compiler turns it into a case pack and you review the extraction once.
2. **Set the room.** Format (interviewer-led like McKinsey, or candidate-led like BCG and Bain), firm flavour, difficulty, hint generosity, voice, and whether the interviewer has a face.
3. **The case.** The interviewer greets you, reads the prompt, and answers clarifying questions only from the facts the case allows. It gives you a moment to structure, listens to your structure, and pushes back if it fails the MECE, Applicable, Creative test. Then it walks the case parts, shows each exhibit only when its part begins, checks your math, probes mistakes the way a real caser would ("walk me through how you got there"), runs brainstorming ("anything else?" until you reach at least four ideas), and asks for the CEO recommendation.
4. **The debrief.** You self-grade first. Then: the verdict (would advance, borderline, would not advance) and the two things that decided it, a three-level grade per dimension with quoted evidence, the three moments that mattered most (with audio replay), the nudges you needed, one drill per weakness, and the next case to do, chosen by your weakest stretch area.
5. **The log.** Every session writes a case-log row in the WCC format automatically: date, case, type, your self-grade against the AI grade, biggest issue, next focus. Over time it shows whether you are improving where you said you would.

## 5. Architecture in one picture

```
Browser (Next.js)                                  Server (Vercel + Supabase)
┌──────────────────────────────┐                   ┌──────────────────────────────┐
│ Interview room               │  voice (WebRTC /  │ Session API                  │
│  - presence / avatar         │◄─ websocket) ────►│  - mints short-lived voice   │
│  - exhibit stage (hidden     │                   │    tokens from user keys     │
│    until the director says)  │                   │                              │
│  - notepad, no calculator    │   events          │ Director (text LLM)          │
│                              │◄─────────────────►│  - holds the answer key      │
│ ACTOR = realtime voice model │   transcript      │  - reads each candidate turn │
│  knows only the current part │──────────────────►│  - unlocks facts + exhibits  │
│  and what has been unlocked  │                   │  - sets nudge level          │
└──────────────────────────────┘                   │  - flags scored moments      │
                                                   │                              │
 Compiler: PDF pages rendered in the browser       │ Postgres: users, case packs  │
 (pdf.js) → vision model → case pack JSON →        │ (private per user), sessions,│
 validator recomputes the math → human review      │ transcripts, scores, log     │
                                                   └──────────────────────────────┘
```

**Stack.** Next.js (App Router, TypeScript), Tailwind v4, GSAP, Vercel, Supabase (auth, Postgres with row-level security, storage). Zod schemas for the case pack. A provider-neutral voice layer with three transports: Gemini Live (default, free tier), ElevenLabs Agents (user's key, premium voice), and browser speech (free fallback). Text mode uses the same interface, which is also what the eval harness drives.

**Models.** Chosen by a bakeoff on a real case, not from docs. Starting candidates: a strong vision model for the one-time compile, a fast text model for the director, the realtime model for the actor.

## 6. Phases

Recruiting sets the calendar: BCG's online case is in mid-November and first-round interviews are in early January. The build has to make Vatsal's own prep better, not compete with it, so **every build session ends with Vatsal casing on what was built.**

| Phase | Window | What ships | Exit test |
|---|---|---|---|
| **0. Prove the brain** | ~1 week of evenings | Compiler on one WCC case with the review screen. Director and actor in **text mode**. Exhibit reveal. A basic debrief. | Leak test passes (no answer or future exhibit leaked across the adversarial script). Vatsal does the case himself and calls it useful. |
| **1. The room** | ~2-3 weeks | Voice through Gemini Live. The designed interview room, exhibit choreography, notepad, full debrief, case log. Five more WCC cases. | Ten Wharton peers each do one case. Binary realism question ("did it feel like a real interviewer?") plus what broke the illusion. |
| **2. Calibrate** | December, light | Self-play harness (AI candidates of six skill profiles casing overnight). Human-vs-AI scoring on 15-20 sessions with second-years or case parents. Cohort benchmarks per case. | First error analysis written. Targets set from it. |
| **3. The face and the world** | January onward, after offers | Avatar tiers, ElevenLabs and avatar keys from users, an original case library, other schools, the public launch and the LinkedIn post. | Published agreement numbers. |

Phase 1 can optionally include a **BCG online-case mode** (interviewer-led, timed, multiple choice and short answer, no clarifying questions, then a recorded 2-minute recommendation), since that format is fixed and well described (BCG workshop, 2026-10-27). It is only worth doing if it is ready well before the online case, otherwise it is a January feature.

## 7. Risks

| Risk | What we do |
|---|---|
| **The build eats case prep.** | Phases sized to evenings. Every session ends in a real case rep. Phase 2 is deliberately light. |
| **Casebook rights.** Darden explicitly bans AI use. Others are club materials. | Uploads stay private to the uploader. The compiler detects AI-restriction notices and blocks or warns. No casebook content in the repo. Ask the WCC Resource Development team (the casebook editors) before using the WCC book beyond personal practice; their blessing is also the distribution channel. |
| **The interviewer leaks the answer.** | The director/actor split, the leak eval as a release gate, and prompt-injection cases in it. |
| **Voice latency kills realism.** | The actor answers immediately. The director acts on the next turn or through UI events, never in the speaking path. p50 turn latency is tracked. |
| **Extraction errors poison a case.** | The validator recomputes every numeric answer it can from the exhibit data. One human review per case before it is playable. |
| **Free tiers change.** | Every provider sits behind the voice adapter, and text mode always works. |
| **Avatar is a gimmick.** | Ships last. The default is a designed presence, not a face. The more valuable camera points at the candidate (presence and eye contact, like BCG's recorded recommendation), so that comes first if any camera does. |

## 8. Decisions open for Vatsal

1. **First test case.** Darden is out unless the Darden club gives permission. I suggest a WCC case (Electro Chargers or Race to the Bottom), with a note to the WCC Resource Development team.
2. **Name.** Options: **Case Parent** (the WCC term for the second-year who cases you), **Second Year**, **Partner Round**.
3. **Audience by December.** Wharton peers only (Google sign-in with a Wharton email, shared free-tier keys), or open sign-up with users' own keys from day one.
4. **Weekly hours through December.** This sets whether Phase 1 lands before the holidays.
5. **The BCG online-case mode.** In or out for Phase 1.
