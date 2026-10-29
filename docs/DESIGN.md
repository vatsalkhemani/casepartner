# Design

The goal is a product that feels like walking into a room, not opening a dashboard. Every competitor lists features. This one has to show the moment.

---

## 1. The idea

Taste Skill asks for one sentence, filled from the subject itself, before any design:

> In this product, **the moment an interviewer slides an exhibit across the table** becomes **the signature move of the whole interface.**

Everything else serves that moment: a quiet, dark room; a light that is the interviewer; paper that arrives when you have earned it.

## 2. Direction: the room at night

| Element | Decision | From |
|---|---|---|
| Ground | Near-black, warm (ink, not pure #000) | UI UX Pro Max "Dark Mode (OLED)", warmed |
| The interviewer | A single field of living light, an **aurora** that breathes with the interviewer's voice: slow and dim while listening, brighter and moving while speaking, a held shimmer while thinking. One hue family per persona, never a rainbow | UI UX Pro Max "Aurora UI": mesh gradients, 8-12s loops, screen blend |
| Exhibits | **Paper.** Warm off-white sheets with real print typography (a serif for titles and tables), square corners, a soft shadow because they genuinely float above the room | UI UX Pro Max "Editorial Grid / Magazine" |
| Type | One editorial serif for exhibits, prompts and the debrief verdict. One clean grotesk for interface text. Final faces dealt by the Taste Skill draw at build time. Avoid the defaults every AI tool ships (Inter alone, Playfair on everything) | Taste Skill type rules: two faces at most |
| Colour | Ground, ink, one accent per persona. The accent appears on the action and the light, nowhere else | Taste Skill colour laws |
| Motion | Choreographed with GSAP timelines: the exhibit handoff, the light, the debrief reveal. Transform and opacity only. Every move has a reduced-motion fallback that keeps the content | GSAP skills, UI UX Pro Max motion 8/10 |

**Where we override Taste Skill.** Its house rules ban gradients, glows and shadows outright. This product needs exactly one gradient (the interviewer's light) and one shadow (paper above the table). Both are deliberate and run through the inspector with `--allow` for those rules only. Every other Taste Skill rule stands: no eyebrow labels, no icon card grids, no glass, no fake dashboards, headlines in two lines or fewer.

## 3. Signature moments

1. **The handoff.** The interviewer says "our analyst just sent this over." The room dims slightly, a sheet slides in from the interviewer's side, settles with a small rotation, and straightens. About 700ms. When the part ends, the sheet slides to the "seen" tray at the edge.
2. **The silence.** When you ask for a moment to structure, the light settles low and the interface goes almost still. No countdown. Real interviews do not show one, and the stillness is the pressure. An optional, quiet elapsed time is in settings.
3. **The verdict.** The debrief opens on one line in large serif: *Would advance*, *Borderline*, or *Not yet*, with the two moments that decided it underneath. Then the detail unfolds.

## 4. Screens

| Screen | Job | Notes |
|---|---|---|
| **Landing** | Say what it is in five seconds, and let the visitor feel the room | Taste Skill page run. **The live thing:** a 60-second case opener right on the page. Read a short prompt, say or type your recap and clarifying questions, get instant feedback in the interviewer's voice |
| **Library** | Pick a case | App-screen rules. Each case shows format, type, difficulty, stretch area and minutes. Filter by your weakest stretch area |
| **Upload and review** | Turn a casebook into playable cases | Notice check first. Side-by-side review: PDF page and extracted fields, drag-to-crop exhibits |
| **Set the room** | Choose who is casing you | Format, firm flavour, difficulty, hint generosity, voice, presence or face |
| **The room** | The case | Light centre stage. Notepad on the right (typed, plus a simple sketch pad for structures). Exhibit stage that is empty until the director unlocks something. No calculator, like the real thing. Captions off by default, one key to toggle |
| **Debrief** | Tell the truth, kindly | Self-grade first, then the verdict, then the dimensions with quoted evidence, three moments with audio replay, nudges received, one drill per weakness, the next case |
| **Log** | Show progress | WCC-style case log, filled automatically. Self-grade against AI grade over time, and weaknesses by recurrence |

## 5. How each skill is used

| Skill | Where | How |
|---|---|---|
| **UI UX Pro Max** | Tokens and styles | `--design-system` for the base tokens, then `--domain style` for Aurora UI and Editorial, `--domain gsap` for motion presets. The generic query returned Swiss minimalism with Inter and "recording red", the safe default, so we query styles directly instead |
| **Taste Skill** | Landing page, then every screen's quality gate | Full run on the landing (subject inventory, idea sentence, direction draw, copy deck, inspector, screenshot critique loop). App screens use its app-screen rules. The inspector runs at 1440, 768 and 390px before anything ships |
| **GSAP skills** | The room and the debrief | Timelines for the handoff and the verdict. The React integration skill for the Next.js components. The performance skill for the light, which runs for 40 minutes and must stay cheap |
| **Superpowers** | The build process | Brainstorm, then write a plan, then test first, then verify before calling anything done. Subagents for parallel work such as authoring original cases |
| frontend-design (installed globally) | Baseline | Fallback for small components |

## 6. Quality bar

- The room holds 60fps on a mid-range laptop for a full case, with the light running.
- Every screen passes the Taste Skill inspector with zero FAILs, with only the two documented overrides.
- WCAG AA contrast on all text, including text on paper and on the light.
- Works at phone width for the library, debrief and log. The room is laptop-first, because that is where people case, with a phone layout that still works.
