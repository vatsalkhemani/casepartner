import type { NumericAnswer } from "../case/schema";

// Numbers are judged by code, never by the model.

export type NumericVerdict =
  | { kind: "correct"; answer: NumericAnswer; value: number }
  | { kind: "magnitude"; answer: NumericAnswer; value: number }
  | { kind: "wrong"; answer: NumericAnswer; value: number }
  | { kind: "none" };

export type SaidNumber = { value: number; scale: number; percent: boolean; raw: string };

const SCALE: Record<string, number> = {
  thousand: 1e3, k: 1e3,
  million: 1e6, mil: 1e6, mm: 1e6, mn: 1e6, m: 1e6,
  billion: 1e9, bn: 1e9, b: 1e9,
};

// "1.5 million", "$1.48M", "5.5 mil", "8 percent" -> values, in the order said.
export function extractNumbers(text: string): SaidNumber[] {
  const out: SaidNumber[] = [];
  const re = /\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(thousand|million|billion|mil|mm|mn|bn|k|m|b|percent|per cent|%)?(?![a-z])/gi;
  for (const m of text.matchAll(re)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    const word = (m[2] ?? "").toLowerCase();
    const percent = word === "%" || word.startsWith("per");
    out.push({ value: n, scale: percent ? 1 : SCALE[word] ?? 1, percent, raw: m[0].trim() });
  }
  return out;
}

function unitScale(unit: string) {
  if (unit.includes("%")) return 1;
  if (/M/.test(unit)) return 1e6;
  if (/B/.test(unit)) return 1e9;
  if (/K/i.test(unit)) return 1e3;
  return 1;
}

type Classified = { kind: "correct" | "magnitude" | "wrong"; answer: NumericAnswer; value: number; dist: number };

function classify(s: SaidNumber, ans: NumericAnswer): Classified {
  const scale = unitScale(ans.unit);
  // A bare "1.5" in a $M case means 1.5M; a bare "1,480,000" is already dollars.
  const value = s.scale !== 1 ? s.value * s.scale : s.value >= 1000 && scale > 1 ? s.value : s.value * scale;
  const ratio = value / (ans.value * scale);
  const dist = Math.abs(Math.log10(Math.abs(ratio) || 1e-9));
  const inUnits = value / scale;
  if (Math.abs(ratio - 1) * 100 <= ans.tolerancePct) return { kind: "correct", answer: ans, value: inUnits, dist };
  if (dist > 0.8) return { kind: "magnitude", answer: ans, value: inUnits, dist };
  return { kind: "wrong", answer: ans, value: inUnits, dist };
}

// Does the candidate's working use the inputs of the expected method? Used
// when no model is available: "14 times 1.08, actual 16.6" is the right
// method even if the subtraction slips. Approach matters more than precision.
export function approachFromSteps(text: string, answer: NumericAnswer): boolean {
  const said = new Set(extractNumbers(text).map((n) => n.value));
  const inputs = new Set<number>();
  for (const step of answer.steps) {
    const nums = extractNumbers(step).map((n) => n.value);
    nums.slice(0, -1).forEach((v) => inputs.add(v)); // the last number in a step is its result
  }
  const hits = [...inputs].filter((v) => said.has(v) || said.has(Math.round(v)) || (v > 1 && v < 2 && said.has(Math.round((v - 1) * 100)))).length;
  return hits >= 2;
}

// Correct if any number the candidate said matches any expected answer.
// Otherwise the last number they said is taken as their answer, because
// candidates finish on the result ("so the gap is about 2 million").
export function judgeNumbers(text: string, expected: NumericAnswer[]): NumericVerdict {
  if (!expected.length) return { kind: "none" };
  const wantsPercent = expected.some((e) => e.unit.includes("%"));
  const said = extractNumbers(text).filter((s) => s.percent === wantsPercent);
  if (!said.length) return { kind: "none" };

  for (const s of said) for (const ans of expected) {
    const v = classify(s, ans);
    if (v.kind === "correct") return { kind: v.kind, answer: v.answer, value: v.value };
  }
  const last = said[said.length - 1];
  // Off by a power of ten is its own error: the candidate should catch it.
  for (const ans of expected) {
    const v = classify(last, ans);
    const shifted = v.value / ans.value;
    const k = Math.round(Math.log10(Math.abs(shifted)));
    if (k !== 0 && Math.abs(shifted / 10 ** k - 1) * 100 <= ans.tolerancePct * 2) return { kind: "magnitude", answer: ans, value: v.value };
  }
  const nearest = expected.map((ans) => classify(last, ans)).sort((a, b) => a.dist - b.dist)[0];
  return { kind: nearest.kind, answer: nearest.answer, value: nearest.value };
}
