# Research

What the plan rests on. Prices and product claims are dated 2026-10-29, mostly secondhand, and must be re-checked before money moves.

---

## 1. How a case is built

Every casebook read (Wharton Consulting Club 2026-27, Kellogg 2024, Case in Point, plus the WCC lecture series) describes the same five blocks: **prompt and clarifying questions, structure, exhibits and math, brainstorming, recommendation.** WCC's timing: setup 2-3 min, structure 3-5, exhibits and math 8-10, brainstorming 4-5, synthesis 2-3, about 20-25 minutes for the case inside a 30-60 minute interview with fit questions and Q&A.

A casebook case page is a script for the interviewer:
- a **prompt** read to the candidate, plus **additional information to provide only on request**;
- a **sample framework and hypothesis**;
- **numbered questions**, each tied to an exhibit and to a "provide upon request" fact list;
- **sample answers** with the math worked;
- **interviewer notes**, which carry the judgement: push for at least four brainstorm ideas because three is low and top candidates give seven or eight; if the candidate's number is off by an order of magnitude they should catch it themselves; in candidate-led cases minimise hand-holding, and if the candidate is lost, use a steering line ("Sure, we'll explore it. Before that, our analyst just sent some data…"); when time runs out, prompt for the recommendation.

Kellogg's guide splits each case into a title page (format, concepts, sectors, type), an interviewer guide (a 30-second summary of the solve path), a prompt page (fit question, prompt, clarifying information), and numbered solving pages, with interviewer prompts above a dotted line and solutions and **assessment criteria** below it.

## 2. How a case is judged

- **Firms rate in three levels**: not good enough, good enough, standout. No percentages (RocketBlocks session at WCC kickoff, 2026-09-11).
- **Kellogg's evaluation criteria** group into four families: case skills and driving the case (problem definition, breakdown, structure, prioritisation, information, solution focus, 80-20, recommendation); communication (structure, focus, questions, engagement, support, business language, body language); polish (confidence, quant, analysis, interpersonal, balance); business sense (creativity, synthesis, concepts, "so what", testing assumptions, risks, judgement).
- **The M.A.C. test for structures** (from Vatsal's RocketBlocks notes): MECE, Applicable, Creative, and all three are required. Common mistakes: "book-report" buckets ("analyse financials" instead of "confirm we hit $100M"), replaying the prompt, a list of good ideas presented as a structure. Phrase each bucket as a test, not a label.
- **WCC lecture guidance**: clarifying questions on Business, Geography, Objective, Timeline; present structure level by level; a hypothesis does not have to be right; for exhibits say what you see, give 2-3 insights, conclude, suggest next steps; for math explain the approach first and talk through every step; the recommendation leads with the answer, then evidence, risks, next steps. Sound less robotic: customise to the company and avoid the word "buckets."
- **Feedback forms** (Kellogg) cover case start, chart, math, brainstorming, recommendation. **Case logs** (WCC) record date, partner, self-grade, and one or two feedback points.

## 3. Firm formats

| Format | Firms (generalised from candidate experience) | What changes |
|---|---|---|
| Interviewer-led | McKinsey, Accenture, Oliver Wyman, Strategy& | The interviewer asks each question in order. More data up front, fewer clarifying questions |
| Candidate-led | BCG, Bain, Deloitte, L.E.K., PwC, Strategy& | The candidate drives and asks for data. Data is held back until requested |

**BCG online case** (BCG workshop, 2026-10-27): a chatbot-led, interviewer-driven case of about 8-10 questions (multiple choice, short answer, fill-in), a visible timer, exhibits, no clarifying questions, answers final once submitted, then a 5-minute window to record a 1.5-2 minute video recommendation after 60 seconds of preparation. First rounds: two 45-minute interviews, each about 10-15 minutes of experience questions, 25-30 minutes of candidate-led case, and Q&A.

**What practice is worth** (RocketBlocks, 2026-09-11): only active, out-loud practice moves the needle; about 100 hours is par; a partner who gives the same 2-3 cases 10-15 times gives comparative feedback nobody else can. **Volume caution** (Wharton career fellow, 2026): performance declined after about 48 cases, so quality over count.

## 4. The competitive landscape

| Tool | What its own page claims | Gap we see |
|---|---|---|
| [CaseRound](https://caseround.ai/) | 30+ cases, **upload your own casebook PDF**, live voice, interviewer-led and candidate-led, three difficulty levels, exhibits "at the right moments", 8 dimensions (structuring, math, judgement, creativity, synthesis, leadership, presence, communication). Free: one case. Pro $39/month: 50 sessions | No published scoring method or accuracy. No avatar described. Exhibit display not described |
| [Case Room](https://www.caseroomprep.com/ai-case-interview-practice) | Voice interviewer, pushback, exhibits, transcript-backed scorecard (setup, structure, quant, judgement, exhibit read, synthesis, communication). First case free | Curated library only, no uploads mentioned |
| [CaseTutor](https://www.casetutor.com/) | Voice, 75+ cases, graded reports, six languages, 7-day trial | |
| [Mock Case AI](https://www.mock-case.ai/), [Caise](https://www.caiseconsulting.com/), [CaseStudyPrep](https://www.casestudyprep.ai/), [Soreno](https://soreno.ai/), [CasePrepared](https://www.caseprepared.com/) | Voice mocks, 5-dimension or 100-point scores, firm-format targeting | |
| RocketBlocks, CaseCoach | **Free to Wharton students** through school. RocketBlocks has 80+ cases, ~75 with expert videos, drills, and AI cases | Incumbent the target user already has for free |

No independent reviews or comparisons were found. Every claim above is the vendor's own.

## 5. Voice

| Option | What it is | Cost (secondhand, verify) | Role |
|---|---|---|---|
| **Gemini Live** (native audio) | Realtime speech-to-speech with function calling | Free tier within rate limits. Paid about $3 per 1M audio input tokens and $12 per 1M output, roughly $0.02/min, so about $1 for a 40-minute case ([Google pricing](https://ai.google.dev/gemini-api/docs/pricing)) | **Default** |
| **ElevenLabs Agents** | Hosted speech-to-text, LLM and text-to-speech orchestration, best voices, voice cloning | About $0.08/min plus the LLM, so about $3.20+ per case. Free plan about 15 minutes, which is less than one case ([summary](https://www.getmacha.com/blog/elevenlabs-agents-pricing-explained)) | **Premium, with the user's own key** |
| Browser speech | Web Speech API recognition plus speech synthesis | Free. Robotic voice, recognition best in Chrome | Fallback and dev |
| Text | Typed chat | Free | Always available. Also what the eval harness drives |

**User keys.** Users paste their own ElevenLabs (or avatar) key in settings. It is stored encrypted server-side and used only to mint short-lived session tokens. It never ships in the browser bundle, and the user can delete it at any time.

## 6. Avatar

| Tier | How | Cost | Verdict |
|---|---|---|---|
| **0. Presence** | No face. A designed interviewer: name, firm style, and a voice-reactive light that shows listening, thinking, speaking | $0 | **Phase 1 default.** No uncanny valley |
| **1. Stylised 3D** | [TalkingHead](https://github.com/met4citizen) (open-source browser 3D avatar with lip sync from word timestamps) on Three.js | $0 runtime | Possible. Avatar model source needs checking: it was built around Ready Player Me avatars, whose service status should be verified |
| **2. Photo-real from a photo** | [Simli](https://docs.simli.com/introduction) (custom face made on their site, WebRTC stream, reported free credit and ~$0.01-0.05/min) or [HeyGen LiveAvatar](https://www.liveavatar.com/) (~$0.10-0.20/min) | ~$0.40 to $8 per case | **Phase 3, user's own key and own photo** |

**Consent rule:** only the user's own face or a generated one. Never a real interviewer's likeness. Always labelled as an AI interviewer.

**Where a camera is worth more:** pointed at the candidate. Body language and presence are on Kellogg's rubric, and BCG's online case ends with a recorded video recommendation. Feedback on pace, eye contact and filler words in the recommendation is a stronger use of a camera than a face for the interviewer.

## 7. Source files read

From the consulting folder: WCC Casebook 2026-27, Kellogg Casebook 2024, Case in Point (concepts only), the WCC Case Lecture Series L01-L06, the RocketBlocks framework notes, the YouTube case breakdowns, the Firm-by-Firm deck, and the case prep plan. **The Darden casebook was not used past its front matter**, because its notice forbids feeding it into AI tools. Meeting notes: WCC kickoff and live case (Sep 11), RocketBlocks session (Sep 11), WCC case lecture (Oct 21), BCG application and interview workshop (Oct 27).
