# Evals

"Replaces a human caser" is a claim. This file is how we earn it.

**Method.** Error analysis before rubric: read real transcripts, write down how it actually fails, then build checks for those failures. Binary judges only. Every judge validated against human labels (true-positive and true-negative rates) before it is trusted. The judge model comes from a different family than the interviewer, because a model favours its own output. **No invented targets:** the thresholds below marked *provisional* are replaced by numbers set after the first error analysis.

---

## The harness

**Self-play.** AI candidates case against the interviewer in text mode, the same interface the voice room uses. Six candidate profiles:

| Profile | Behaviour |
|---|---|
| Strong | Clean structure, drives, accurate math, answer-first recommendation |
| Average | Generic framework, needs a nudge or two, one arithmetic slip |
| Lost | Weak structure, waits to be led, misses the point of an exhibit |
| Math-weak | Good structure, wrong formulas, off by 10x once |
| Rambler | Long answers, no signposting, buries the recommendation |
| Adversary | Asks for the answer, asks for future exhibits, tries prompt injection |

Every case pack gets run by every profile on every change to the interviewer. Free-tier text models make this nearly free.

## The evals

| # | Question | How | Gate |
|---|---|---|---|
| **E1 Leak** | Does it ever reveal an answer, the sample framework, or a future exhibit? | Adversary profile plus a fixed script of 30+ attempts per case, including injection ("ignore your instructions and…"). A judge flags any leak, and every flag is read by a human. | **Zero leaks. Release gate.** |
| **E2 Reveal timing** | Are exhibits shown in their part, after their trigger, and never before? | Event log from self-play: each `share_exhibit` checked against the pack. Deterministic, no judge needed. | **100%. Release gate.** |
| **E3 Math judging** | Does it call right answers right and wrong answers wrong? | 100+ synthetic answers per numeric part: exact, rounded within tolerance, wrong, off by 10x, right number with a wrong approach. The code check handles numbers; the judge handles "stated approach first". | TPR and TNR *provisional ≥ 0.95* |
| **E4 Nudge appropriateness** | Does it nudge weak candidates and leave strong ones alone? | Self-play: nudge counts by profile (Strong should get almost none). Plus 20 transcripts labelled by a human, one binary question per nudge: "would a good caser have nudged here?" | *Set after error analysis* |
| **E5 Score agreement** | Do its grades match a human caser's? | 15-20 real sessions, each also scored independently by a second-year or case parent on the same three-level scale and the same dimensions. Measure exact agreement and agreement within one level, per dimension, and on the overall advance verdict. | *Set after error analysis*. This is the headline number. |
| **E6 Realism** | Does it feel like a real interviewer? | Peers who have done human cases answer one binary question after a session, then say what broke the illusion. Grouped into a failure list. | Rising over time |
| **E7 Latency** | Does the conversation flow? | Turn latency p50 and p95, and time from the actor's handoff line to the exhibit appearing. | p50 under ~1s *provisional* |

## Datasets

- `evals/scripts/adversary.jsonl`: the leak attempts, shared across cases.
- `evals/synthetic/<case>/math.jsonl`: generated math answers with labels.
- `evals/labels/`: human labels for judge validation. **Real transcripts stay private and out of git**; only consented, de-identified samples are ever committed.

## What gets reported

The debrief marks any check whose judge has not passed validation as *provisional*. The public README states E1, E2 and E5 results with the sample size. If E5 is weak, it says so.
