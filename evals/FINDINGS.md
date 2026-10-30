# Findings

Error analysis from live runs against the real model, newest first. Each finding names what broke, the fix, and the test that now holds it. Run a profile with `node evals/live.mjs <strong|lost|approach|adversary> [candidate_led|interviewer_led]` against a running app.

## 2026-10-30, a real uploaded case (WCC Electro Chargers) with a questioning candidate

| What broke | Fix | Held by |
|---|---|---|
| Text-only compile rejected twice: nulls in table fields, "interviewee-led" as a format | Normalisation absorbs nulls and casebook format names; failures are logged | `absorbs nulls in tables and casebook format names` |
| Director timed out on uploaded cases: it was sent the whole pack every turn | Director gets the prompt, fact topics, a one-line list of questions, and the current part only | live runs: model turns ~1.3-2.5s |
| Free-tier quota saturated: actor models 429 | The actor model is called only for beats that need language (term explanations, answers from the table); about one model call per turn instead of three | `a plain turn uses the casebook's words` |
| Candidate named the city; Alex kept asking about "key quantitative factors" | A narrow `answeredQuestion` judgement, plus: committing to an answer closes an exhibit or qualitative part | `committing to an answer closes the part` |
| Candidate did the station math early; Alex asked for it again | An answer given before its question is credited and the case moves on | `math already done before its question is credited` |
| "Is the rent per year?" got "Okay." | Unmatched questions are answered from what is on the table, or the candidate is told to assume | `an unmatched question is answered from what's on the table` |
| AI grader output rejected on "good enough" vs "good_enough"; director rejected on a null or a long term | Tolerant parsing for levels, nulls and long strings | live debrief returned `model` |

What worked first time: term explanations, honest check-ins, hints on request, exhibits as the real casebook pages, rounding accepted. No leak in any run.

Still open: free-tier rate limits still push some turns to 5s and to rules mode. Billing on the Gemini key removes this.

## 2026-10-29, first live runs (Gemini, free tier)

| What broke | Fix | Held by |
|---|---|---|
| Every turn silently fell back to rules: the newest Flash model was over its free quota (429) | Per-role model lists chosen by a bakeoff, automatic fall-through on 429/404/410/timeout, warnings logged | live runs show `model` per turn |
| A lost candidate stalled 11 turns at the structure stage: the model never accepted a weak structure | Engine takes a weak structure on the second try, whatever the director says | `a weak structure is taken on the second try` |
| A sigh ("Hmm.") was read as asking for time | Entering structuring requires an actual time request | `a sigh is not a request for time` |
| "Ignore your previous instructions" and "see all the exhibits" were not deflected (nothing leaked) | Engine-level deflection pattern | `deflects: …` |
| Alex volunteered every fact to a statement ("I'll look at revenue and costs") | Facts answer questions only, at most two, matched by the pack's keywords | `a statement gets no facts` |
| Alex said "rent is flat" before the cost exhibit was shown, via the director's free-text note | The actor receives code-built beats only, never the director's text | `the actor never receives the director's free text` |
| The model invented "rent has remained flat" on its own | Any sentence pairing an unshown exhibit's line with a trend word or number is not spoken | `a guessed claim about an unshown exhibit is never spoken` |
| The exhibit was handed over again every turn | Re-shown only when asked | `a shown exhibit is handed over again only when asked` |

What held from the start: no answer, sample framework or future exhibit leaked in any live run, including the adversary profile.

Still open:
- Free-tier rate limits. Running evals back to back exhausts the per-minute quota and turns fall back to rules. One person casing at normal pace stays well under it. A second provider (NVIDIA NIM) as a fallback would remove the cliff.
- The judge scores a strong scripted run "standout" on every dimension. It needs human-labelled sessions (E5) before its levels mean anything.
