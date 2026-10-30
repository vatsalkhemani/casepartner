# Case Partner

An AI interviewer for consulting case practice. It runs a case the way a good second-year does: reads the prompt, holds back data until you ask for it, shows each exhibit when its part begins, nudges you when you are stuck, probes your math, and ends with a verdict on whether you would have advanced, backed by evidence from your own transcript.

**Status:** MVP. One original case (Lantern Coffee), voice in and out, both formats, exhibits revealed by part, a scored debrief. The plan is in [docs/PLAN.md](docs/PLAN.md).

## Run it

```bash
npm install
cp .env.example .env.local   # add a free Gemini key from https://aistudio.google.com/apikey
npm run dev                  # http://localhost:3000, use Chrome or Edge for voice
npm test                     # leak, reveal-timing, math and ladder tests
```

Without a key the built-in rules interviewer runs the whole case, which is enough to try the room. With a key, a model directs the case and phrases the interviewer's lines, and code still decides what can be revealed.

## How it works

- **Director and actor.** The director sees the answer key and decides what the candidate has earned. The actor speaks and only ever sees what has been unlocked. Code enforces the reveal rules either way ([docs/INTERVIEWER.md](docs/INTERVIEWER.md)).
- **Numbers are checked by code**, including 10x slips.
- **Voice** uses the browser's own speech engines for now, behind one interface so a realtime voice model can replace it.

## Layout

```
docs/            The plan: research, interviewer design, case format, design, evals
.claude/skills/  Design and build skills used in this repo (third-party, MIT, licences kept)
cases/library/   Original cases (coming)
cases/private/   Compiled casebooks, never committed
```

## Content rule

Casebooks belong to their authors. Uploaded casebooks stay private to the person who uploaded them, and the compiler refuses books whose notice forbids use with AI tools.
