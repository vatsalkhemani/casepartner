# Findings

Error analysis from live runs against the real model, newest first. Each finding names what broke, the fix, and the test that now holds it. Run a profile with `node evals/live.mjs <strong|lost|approach|adversary> [candidate_led|interviewer_led]` against a running app.

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
