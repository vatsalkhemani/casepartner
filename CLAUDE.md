# Case Partner

An AI case interviewer. The plan is in [docs/PLAN.md](docs/PLAN.md); read it before building anything.

## Rules for working here

- **No casebook content in git.** Anything compiled from a casebook goes in `cases/private/` (gitignored). Never paste casebook text into docs, tests or fixtures; write original examples instead. The Darden casebook forbids AI use and is not to be read.
- **The answer key never reaches the actor.** Any change to prompts or session state must keep the director/actor split in [docs/INTERVIEWER.md](docs/INTERVIEWER.md). E1 (leak) and E2 (reveal timing) in [docs/EVALS.md](docs/EVALS.md) are release gates.
- **Numbers are checked by code, not by the model.**
- **Pick models and providers by measuring them** on a real case, not from documentation.
- **Design work** uses the skills in `.claude/skills/` as described in [docs/DESIGN.md](docs/DESIGN.md), including the two deliberate overrides of Taste Skill (the interviewer's light and the paper shadow).
- No em dashes in copy. Public-facing text describes the product to a stranger.
- Git: commit to main directly, no lingering branches.
