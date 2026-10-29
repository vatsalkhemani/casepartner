# The case pack

A casebook page is written for a human interviewer: a prompt, "additional information (provide upon request)", a sample framework, numbered questions, an exhibit per question, interviewer notes, and sample answers. The compiler turns that into a structured **case pack** the director and actor can run. Original cases are written straight into this format.

---

## 1. Content rules (non-negotiable)

1. **Uploads are private to the uploader.** A case pack compiled from someone's casebook is visible only to them, never shared across users, and never used to improve anything else.
2. **The compiler checks the notice first.** Before extracting anything, it scans the front matter for restrictions on AI use (Darden's casebook says it must not be fed into generative AI tools). If it finds one, it stops and tells the user why.
3. **The uploader confirms they have the right to use the file** for personal practice.
4. **No casebook-derived content in this repo.** `cases/private/` is gitignored. Only original cases live in `cases/library/`.
5. **Every pack records its source** (book, pages, and any notice) so attribution survives.

## 2. The pipeline

```
PDF ──► render pages to images in the browser (pdf.js)
     ──► notice check on front matter
     ──► split into cases (title pages / table of contents)
     ──► vision model reads each case's pages ──► draft case pack (JSON)
     ──► validator
           - schema check (zod)
           - recompute every numeric answer it can from the exhibit tables
           - flag parts with no expected answer, exhibits never referenced, nudges missing
     ──► review screen: PDF page on the left, extracted fields on the right,
         drag to crop each exhibit, fix anything flagged
     ──► status: ready
```

Rendering in the browser keeps PDF processing off the server. The compile runs once per case, so a stronger model is affordable here.

## 3. Schema

Field names here are the contract between compiler, director, actor, and evals.

```ts
CasePack {
  id, title, version
  source: { kind: "original" | "upload", book?, pages?, notice? }
  meta: {
    format: "interviewer_led" | "candidate_led"
    type: "profitability" | "market_entry" | "growth" | "pricing" | "m_and_a"
        | "operations" | "market_sizing" | "investment" | "unconventional"
    industry, difficulty: 1 | 2 | 3, stretch_area, minutes
  }
  prompt: { read_aloud: string, objective: string }
  clarifying_facts: [{ topic, answer, volunteer_upfront: boolean }]
  opening: { expected_clarifiers: string[] }        // e.g. business model, goal
  sample_framework: { buckets: Bucket[], hypothesis: string }
  parts: [{
    id, kind: "exhibit" | "math" | "brainstorm" | "qualitative"
    question                      // what the interviewer asks (interviewer-led)
    unlock_when                   // what the candidate must ask for (candidate-led)
    exhibits: ExhibitId[]
    facts_on_request: [{ topic, answer }]
    expected: {
      insights?: string[]
      numeric?: [{ label, value, unit, tolerance_pct, steps: string[] }]
      ideas?: { examples: string[], min: 4, standout: 7 }
    }
    checks: RubricCheck[]         // binary checks specific to this part
    nudges: { l1: string, l2: string, l3: string, l4: string }
    common_mistakes: [{ pattern, probe }]
  }]
  synthesis: { recommendation, reasons: string[], risks: string[], next_steps: string[] }
  exhibits: [{ id, title, image, data?: Table, caption? }]
  interviewer_notes: string[]     // casebook guidance, e.g. "push for at least 4 ideas"
}
```

`data` on an exhibit is the table behind the chart, when it can be extracted. It lets the validator recompute answers and lets the director check exhibit reads ("food waste doubled" can be verified against the table).

## 4. A worked example (original case)

A short original case to show the shape. It is not taken from any casebook.

> **Lantern Coffee** · candidate-led · profitability · difficulty 1
>
> **Prompt:** Lantern Coffee runs 40 cafés across the Pacific Northwest. Revenue grew 8% last year, but operating profit fell from $6M to $4M. The CEO wants to know why, and what to do about it.
>
> **Clarifying facts:** Lantern makes money from drinks (70% of revenue) and food (30%). Goal: return to $6M within two years. No new cafés opened last year.
>
> **Part 1 (exhibit):** unlocked when the candidate asks about costs. Exhibit A is a cost breakdown for two years. Expected insight: dairy and labour costs rose faster than revenue, and food waste doubled after a menu expansion.
>
> **Part 2 (math):** "How much of the $2M drop comes from food waste?" Waste went from 4% to 8% of $15M of food revenue, which is $0.6M, so about 30% of the drop. Tolerance 5%.
>
> **Part 3 (brainstorm):** "How could Lantern cut waste without hurting sales?" At least four ideas expected: trim the menu, demand-based baking, end-of-day discounts, prepared-to-order items.
>
> **Synthesis:** cut the expanded menu back to its best sellers and fix labour scheduling first. Risk: regulars who like the new items. Next step: a four-week pilot in five cafés.

## 5. Sources of cases

| Source | Use |
|---|---|
| Original cases written for this product | The public library and the demo. Written in the case-pack format and reviewed against the anatomy above |
| A user's own casebook | Private, for their own practice, after the notice check |
| A club that grants permission | The path to a club-endorsed library (start with the Wharton Consulting Club) |
| Firms' public practice cases | Only after checking each firm's terms |
