import { describe, expect, it } from "vitest";
import { detectNotice, findCases, locateCase } from "@/lib/case/casebook";

// Synthetic pages in the shapes real casebooks use. No casebook text is copied here.
const page = (...lines: string[]) => lines.join("\n");

describe("notice check", () => {
  it("blocks a book whose terms forbid AI tools", () => {
    const pages = [page("Club Casebook 2026"), page("These materials are proprietary to the club and should not be shared or reproduced without written permission.", "This includes feeding this content into generative AI assistants or tools.")];
    expect(detectNotice(pages).kind).toBe("blocked");
  });
  it("flags plain copyright for confirmation, not a block", () => {
    expect(detectNotice([page("Casebook"), page("© 2020 A. Author. All rights reserved.")]).kind).toBe("copyright");
  });
  it("passes a book with no terms", () => {
    expect(detectNotice([page("Casebook 2026", "Welcome, members!")]).kind).toBe("none");
  });
  it("does not block a case that merely discusses AI", () => {
    const pages = [page("Casebook"), page("Case 3: Robo Advisors", "The client wants to use artificial intelligence tools to cut costs. Should they?")];
    expect(detectNotice(pages).kind).toBe("none");
  });
});

describe("finding cases", () => {
  const book = [
    page("Casebook 2026"),
    page("Table of contents", "Case 1: Solar Farms 12", "Case 2: Pet Insurance 20", "Case 3: Ferry Co 28", "Case 4: Glass Works 35"),
    page("Case 1: Solar Farms", "Format: interviewee-led"),
    page("Solar Farms - Prompt", "Your client..."),
    page("Solar Farms - Exhibit A"),
    page("Case 2: Pet Insurance", "Format: interviewer-led"),
    page("Pet Insurance - Prompt"),
    page("Case 3: Ferry Co"),
    page("Ferry Co - Exhibit A"),
    page("Ferry Co - Exhibit B"),
  ];

  it("finds numbered cases and skips the contents page", () => {
    const cases = findCases(book);
    expect(cases.map((c) => [c.title, c.start, c.end])).toEqual([
      ["Solar Farms", 3, 5],
      ["Pet Insurance", 6, 7],
      ["Ferry Co", 8, 10],
    ]);
  });

  it("treats a repeated running header as one case", () => {
    const headed = [page("Intro"), page("Case #1. McKinsey. 2020. Diesel trucks", "Q1"), page("Case #1. McKinsey. 2020. Diesel trucks", "Q2"), page("Case #2. BCG. 2019. Hotel chain", "Q1")];
    expect(findCases(headed).map((c) => [c.title, c.start, c.end])).toEqual([
      ["Diesel trucks", 2, 3],
      ["Hotel chain", 4, 4],
    ]);
  });

  it("locates a typed name, ignoring the contents page", () => {
    expect(locateCase(book, "pet insurance")).toMatchObject({ start: 6, end: 7 });
    expect(locateCase(book, "ferry")).toMatchObject({ start: 8 });
  });

  it("locates an unnumbered case by its title", () => {
    const unnumbered = [page("Contents", "Avalon 65", "Busch's Barber Shop 75", "Bubbly LLC 86", "Chic Cosmetology 97"), page("Avalon", "Opportunity assessment"), page("Avalon: interviewer guide"), page("Avalon: exhibit 1")];
    expect(locateCase(unnumbered, "Avalon")).toMatchObject({ start: 2 });
  });

  it("returns null when the name is not in the book", () => {
    expect(locateCase(book, "Lunar Mining")).toBeNull();
  });
});

import { normalise, parsePack } from "@/lib/case/compile";

describe("normalising what the model returns", () => {
  it("absorbs nulls in tables and casebook format names", () => {
    const raw = {
      title: "X",
      meta: { formats: ["Interviewee-led"] },
      prompt: { readAloud: "Your client..." },
      parts: [{ kind: "math", question: "How many?", exhibits: ["A", "Z"], expected: { numeric: [{ value: "96", unit: "stations" }] } }],
      exhibits: [{ id: "A", label: "Exhibit A", title: "Cities", page: 3, table: { columns: ["City", "EVs"], rows: [["NY", 60000], ["DC", null]], unit: null, note: null } }],
    };
    const { pack, error } = parsePack(normalise(raw, "Book", "X"));
    expect(error).toBeUndefined();
    expect(pack!.meta.formats).toEqual(["candidate_led"]);
    expect(pack!.exhibits[0].table!.rows[1]).toEqual(["DC", ""]);
    expect(pack!.parts[0].exhibits).toEqual(["A"]); // a reference to a missing exhibit is dropped
    expect(pack!.parts[0].expected.numeric[0].value).toBe(96);
  });
});
