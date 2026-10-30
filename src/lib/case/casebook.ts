// Reading a casebook PDF's text, in the browser, before anything is sent
// anywhere: is the book usable with AI at all, which cases does it hold, and
// which pages belong to the one the user picked. Pure functions, so they are
// tested without a PDF.

export type Notice =
  | { kind: "blocked"; quote: string } // the book forbids use with AI tools
  | { kind: "copyright"; quote: string } // usable for your own practice; confirm first
  | { kind: "none" };

const AI_WORDS = /(generative\s+ai|artificial\s+intelligence|\bai\b[\s-]+(tools?|assistants?|models?|systems?)|chat\s?gpt|large\s+language\s+models?|\bllms?\b|machine\s+learning\s+tools?)/i;
const FORBID = /(not\s+be\s+(shared|used|reproduced|uploaded|fed|input|entered)|may\s+not|must\s+not|should\s+not|prohibit|forbidden|without\s+(the\s+)?(explicit\s+)?(prior\s+)?(written\s+)?permission|not\s+permitted|do\s+not\s+(share|upload|feed|input))/i;
const COPYRIGHT = /(©|\(c\)\s*\d{4}|copyright|all\s+rights\s+reserved|proprietary)/i;

function sentences(text: string): string[] {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
}

// Front matter is where clubs put their terms; look at the first pages.
export function detectNotice(pages: string[], frontPages = 8): Notice {
  const front = pages.slice(0, frontPages);
  const all = sentences(front.join(" "));
  for (let i = 0; i < all.length; i++) {
    const window = all.slice(i, i + 2).join(" ");
    if (AI_WORDS.test(window) && FORBID.test(window)) return { kind: "blocked", quote: window.slice(0, 400) };
  }
  for (const s of all) if (COPYRIGHT.test(s)) return { kind: "copyright", quote: s.slice(0, 240) };
  return { kind: "none" };
}

export type CaseSpan = { title: string; start: number; end: number }; // 1-based, inclusive

const CASE_LINE = /^\s*case\s*#?\s*(\d{1,3})\s*[.:)\-–—]?\s*(.{2,90})$/i;

function headLines(page: string, n = 8): string[] {
  return page.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, n);
}

// A contents page lists many cases; it is never where a case starts.
function isContentsPage(page: string, titles: string[]): boolean {
  if (/\b(table of contents|contents)\b/i.test(page.slice(0, 400))) return true;
  // a column of bare page numbers ("Avalon / 65 / Busch's Barber Shop / 75 ...")
  if (page.split(/\n/).filter((l) => /^\s*\d{1,3}\s*$/.test(l)).length >= 8) return true;
  const lower = page.toLowerCase();
  const distinct = [...new Set(titles.map((t) => t.toLowerCase()))]; // a running header repeats one title
  return distinct.filter((t) => t.length > 3 && lower.includes(t)).length >= 4;
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^(mckinsey|bcg|bain|deloitte|kearney|oliver wyman|l\.?e\.?k\.?)\.?\s*(\d{4})?\.?\s*/i, "")
    .replace(/\s+\d{1,3}$/, "") // a page number from a contents line
    .replace(/[.\s]+$/, "")
    .trim();
}

// Numbered case titles ("Case 3: Smart Radiators", "Case #1. McKinsey. 2020. Diesel trucks").
// A title repeated as a running header on consecutive pages is one case.
export function findCases(pages: string[]): CaseSpan[] {
  const hits: { title: string; page: number; n: number }[] = [];
  pages.forEach((page, i) => {
    for (const line of headLines(page, 14)) {
      const m = line.match(CASE_LINE);
      if (m && !/^(math|type|interview|prompt|log|feedback|study|competition|prep)/i.test(m[2])) {
        hits.push({ title: cleanTitle(m[2]), page: i + 1, n: Number(m[1]) });
        break;
      }
    }
  });
  const titles = hits.map((h) => h.title);
  const body = hits.filter((h) => !isContentsPage(pages[h.page - 1], titles));
  const starts = body.filter((h, i) => i === 0 || body[i - 1].n !== h.n); // running headers repeat the same case
  return starts.map((h, i) => ({
    title: h.title,
    start: h.page,
    end: Math.min(pages.length, (starts[i + 1]?.page ?? pages.length + 1) - 1, h.page + 24),
  }));
}

// The user typed a name: find the first page, outside the contents, where it
// heads the page. Then run to the next detected case, or a sensible length.
export function locateCase(pages: string[], name: string, known: CaseSpan[] = findCases(pages)): CaseSpan | null {
  const needle = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (needle.length < 3) return null;
  const listed = known.map((k) => k.title);
  const exact = known.find((k) => k.title.toLowerCase().includes(needle));
  if (exact) return exact;
  for (let i = 0; i < pages.length; i++) {
    const head = headLines(pages[i], 10).join(" ").toLowerCase().replace(/\s+/g, " ");
    if (!head.includes(needle) || isContentsPage(pages[i], listed)) continue;
    // keep going while the following pages still carry this case (running headers)
    let end = i + 1;
    const next = known.find((k) => k.start > i + 1);
    const stop = Math.min(pages.length, next ? next.start - 1 : i + 14, i + 24);
    while (end < stop) end++;
    return { title: name.trim(), start: i + 1, end };
  }
  return null;
}
