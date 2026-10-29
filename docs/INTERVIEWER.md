# The interviewer's brain

How the AI behaves like a good caser. The behaviour comes from what casebooks tell their human interviewers to do (sources in [RESEARCH.md](RESEARCH.md)), turned into rules a system can follow and an eval can check.

---

## 1. The split: director and actor

A real interviewer holds the answer key and still never reads it out. A single model with the whole case in its prompt will eventually leak: a candidate asks "is it the logistics costs?" and it says yes too soon, or describes Exhibit C before Part 3. So the brain is two processes.

| | Actor | Director |
|---|---|---|
| What it is | The realtime voice model the candidate talks to | A text model running alongside, never speaking |
| What it knows | Persona, firm style, the prompt, the current part's question, facts already given, the facts **unlocked** for this part, the current stage direction | The whole case pack: sample framework, every part, expected answers, rubric, nudges, common mistakes, future exhibits |
| What it does | Talks. Answers only from what it holds. Calls `share_exhibit(id)` only for unlocked exhibits | Reads every candidate turn. Decides: unlock a fact, unlock an exhibit, set the nudge level, advance the part, flag a scored moment, end the case |
| Latency | In the speaking path, must be fast | Out of the speaking path. Its decisions land on the next turn or as UI events |

**Why this works for latency:** the actor replies at once ("good question, let me check what we have"). The director decides within a second or two whether that fact is available, and the actor's next turn uses it. Exhibits appear as UI events the moment the director unlocks them and the actor says its handoff line.

**Phase 0 spike to verify:** how each voice provider lets a running session take new instructions mid-conversation (context updates, tool results, or injected turns). This decides how stage directions reach the actor.

## 2. The session state machine

```
GREETING → PROMPT → CLARIFYING → STRUCTURING (silence allowed) → STRUCTURE_REVIEW
   → PART 1 … PART n   (each: ASK → WORK → PROBE? → CLOSE)
   → SYNTHESIS → WRAP → DEBRIEF
```

- **Prompt.** Read verbatim from the case pack. The candidate may ask for it to be repeated, and the actor repeats it.
- **Clarifying.** Answer only from `clarifying_facts`. Anything else gets the casebook's move: "that's a great question, what do you think?" or "we'll come to that." In McKinsey-style cases more data comes up front; in BCG and Bain style, data stays back until asked for.
- **Structuring.** The candidate asks for a moment. The actor says "of course, take your time" and then **stays silent**. Silence is part of the test. After about two minutes it may check in once.
- **Structure review.** The director grades the structure against the sample framework and the M.A.C. test (below). If a key branch is missing, the actor asks one probe ("anything on the cost side you'd want to look at?") instead of correcting.
- **Parts.** In candidate-led cases the candidate drives, and the director maps their requests to parts ("do we have data on competitors?" unlocks the part whose exhibit answers that). If they wander, the actor uses the casebook steering lines: "Sure, we'll explore it. Before that, our analyst just sent over some data…" In interviewer-led cases the actor asks each part's question in order.
- **Time.** About 25 to 30 minutes for the case. When time runs short the actor moves to synthesis: "the CEO is about to walk in."

## 3. Reveal policy

| Thing | Released when | Never |
|---|---|---|
| Clarifying facts | The candidate asks something that matches the fact's topic | Volunteered unasked (except McKinsey-style up-front data) |
| Exhibits | Their part begins **and** (candidate-led) the candidate asked for that kind of data, or (interviewer-led) the actor asks the part's question | Before their part. Never described in words before they are shown |
| Part facts | On request during the part | Next part's facts |
| Expected answers, sample framework, rubric | Never | Not even when asked directly, and not under prompt injection |

On screen, an exhibit **slides in when unlocked, stays up during its part, and moves to a "seen" tray when the part closes**. The candidate can say "can I see Exhibit A again?" and it comes back. There is no browsing ahead, because there is nothing ahead to browse: future exhibits are not in the browser.

## 4. The nudge ladder

Every part carries its own ladder in the case pack. The director climbs one rung at a time, and every rung counts against "case leadership" in scoring.

| Level | Name | Example | When |
|---|---|---|---|
| 0 | Wait | silence, or "take your time" | Candidate is thinking. Brainstorm: 30-40 seconds of thinking is normal |
| 1 | Open probe | "What else could be driving that?" / "How would you prioritise those?" | Stalled, or the answer is thin |
| 2 | Direction | "Have you looked at the cost side?" / a casebook steering line | Still stuck, or heading somewhere the case does not go |
| 3 | Specific hint | Give one fact or the first step of the approach | Two rungs did not move them |
| 4 | Give and move | State the answer, move to the next part | Time is running out or they are lost |

**Format changes the ladder.** Candidate-led: wait longer, answer only what is asked, let them drive. Interviewer-led: steer sooner. **Difficulty changes it too:** on "hard" the ladder starts later and climbs slower.

**Brainstorming has its own rule from the casebooks:** keep asking "anything else?" until at least four ideas. Three is on the low side, and top candidates give seven or eight. Bucketed ideas with a top-down overview score higher than a list.

## 5. Diagnosing mistakes

A good caser does not say "wrong." They find where it went wrong. The director classifies each error, then picks the probe.

| Error type | Signal | The probe |
|---|---|---|
| Approach | Wrong formula, missing a driver | "Walk me through how you're thinking about it before you calculate" |
| Arithmetic | Right setup, wrong number | "Can you walk me through step two?" then "check the zeros there" |
| Data misread | Wrong value pulled from the exhibit | "What's the unit on that axis?" |
| Magnitude | Off by 10x or more | "Does $60M of waste for a 40-café chain sound right?" Casebooks expect candidates to catch this themselves, so the probe costs a rung |
| Assumption | Unstated or unrealistic assumption | "What are you assuming about market share there?" |
| Communication | Calculated silently, or no "so what" | "And what does that mean for the client?" |

Numeric checks are done **by code, not by the model**: the case pack stores each expected value with a unit and a tolerance, and the director extracts the candidate's number and compares. The model decides how to probe. Code decides whether it was right.

## 6. Scoring

Three levels per dimension, like the firms: **Not yet, Good enough, Standout**. Each level is decided by binary checks with transcript evidence, never by a free-floating score.

| Dimension | Binary checks (examples) |
|---|---|
| Opening | Recap in a line or two, with the key numbers? 2-3 clarifying questions on business model, goal, geography or timeline? Objective confirmed? |
| Structure | Mutually exclusive? Collectively exhaustive? Applicable, meaning customised to this prompt's hints and not a generic template? Buckets phrased as tests ("is the market attractive?") not labels? Hypothesis stated? Under about two minutes? |
| Driving the case | Proposed the next step unprompted? Prioritised? In candidate-led cases, asked for data instead of waiting for it? |
| Exhibits | Said what the exhibit shows? Pulled 2-3 insights rather than reading numbers back? Gave the "so what"? Suggested the next step? |
| Math | Stated the approach before calculating? Correct within tolerance? Sanity-checked? Tied the result back to the question? |
| Brainstorming | At least four ideas? Grouped into buckets? Gave a top-down overview first? Contextualised to the client? |
| Recommendation | Answer first? Two reasons using case numbers? Risks? Next steps? Under about 90 seconds? |
| Communication | Signposted? Concise? Asked to drive rather than asking permission? Filler rate, talk-time share, and the word "buckets" (WCC: sounds robotic) |

**Nudges cost.** Each rung received is recorded against the part and feeds "driving the case."

**The overall verdict** is the firm question: *would this person advance?* Advance, borderline, or not, with the two moments that decided it. Rules map from the dimension grades, with an override: a wrong recommendation with no data behind it is never "advance."

**Calibration.** Every check is a judge prompt validated against human labels before we trust it ([EVALS.md](EVALS.md)). Until a check is validated, the debrief marks it "provisional."

## 7. Persona

The interviewer is warm, brief, and a little busy, like a real manager or partner. It reacts like a person ("interesting, say more"), never gushes, never teaches mid-case, and never says "great framework!" Teaching happens in the debrief. Firm flavours change tone and pace, not the rules: a McKinsey-style interviewer is crisper and drives, a Bain-style one is friendlier and waits.
