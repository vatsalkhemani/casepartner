"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Debrief as DebriefData, Level } from "@/lib/interviewer/debrief";
import type { SessionState } from "@/lib/interviewer/session";

const VERDICT = {
  advance: { line: "Would advance", tone: "var(--good)" },
  borderline: { line: "Borderline", tone: "var(--warn)" },
  not_yet: { line: "Not yet", tone: "var(--bad)" },
} as const;

const LEVEL: Record<Level, { label: string; n: number }> = {
  not_yet: { label: "Not yet", n: 1 },
  good_enough: { label: "Good enough", n: 2 },
  standout: { label: "Standout", n: 3 },
};

const SELF = { A: "advance", B: "borderline", C: "not_yet", D: "not_yet" } as const;

function mmss(ms?: number) {
  if (ms == null) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Debrief({ debrief, state, selfGrade, title }: { debrief: DebriefData; state: SessionState; selfGrade: string; title: string }) {
  const root = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const v = VERDICT[debrief.verdict];
  const s = debrief.signals;
  const nudgeTotal = s.nudges.reduce((a, n) => a + n.levels.length, 0);
  const calibrated = SELF[selfGrade as keyof typeof SELF] === debrief.verdict;
  const weakest = debrief.dimensions.filter((d) => d.level === "not_yet").map((d) => d.name);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.timeline()
        .from("[data-verdict]", { y: 24, opacity: 0, duration: 0.9, ease: "power3.out" })
        .from("[data-reveal]", { y: 18, opacity: 0, stagger: 0.07, duration: 0.5, ease: "power2.out" }, "-=0.4");
    },
    { scope: root },
  );

  const logRow = [
    new Date().toISOString().slice(0, 10),
    "Case Partner (AI)",
    title,
    `self ${selfGrade} / AI ${v.line}`,
    weakest[0] ?? "None flagged",
    debrief.drills[0] ?? "",
  ].join(" | ");

  return (
    <main ref={root} className="mx-auto max-w-5xl px-4 pb-24 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <a href="/" className="font-serif text-xl tracking-tight">Case Partner</a>
        <a href="/" className="rounded-full bg-ground-3 px-4 py-2 text-sm hover:bg-ground-2">Do another case</a>
      </header>

      <section className="pt-10">
        <p className="text-ink-2">{title} · {s.minutes} minutes</p>
        <h1 data-verdict className="mt-3 font-serif text-[clamp(3rem,9vw,6.5rem)] leading-none tracking-[-0.03em]" style={{ color: v.tone }}>
          {v.line}
        </h1>
        <div data-reveal className="mt-8 max-w-3xl space-y-2 text-lg leading-relaxed text-ink-2">
          {debrief.decidedBy.map((d) => <p key={d}>{d}</p>)}
        </div>
        <p data-reveal className="mt-6 text-ink-3">
          You graded yourself {selfGrade}. {calibrated ? "That matches." : "That's different from the read here, which is worth noticing."}
          {debrief.provisional && " Scores are provisional until they are checked against human casers."}
        </p>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-4" data-reveal>
        {[
          ["Nudges you needed", String(nudgeTotal)],
          ["Your share of talk", `${s.talkShare}%`],
          ["Filler words per 100", String(s.fillerPerHundred)],
          ["Exhibits worked", String(s.exhibitsSeen)],
        ].map(([k, val]) => (
          <div key={k} className="rounded-2xl bg-ground-2 p-5">
            <p className="font-serif text-4xl">{val}</p>
            <p className="mt-1 text-sm text-ink-2">{k}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 data-reveal className="font-serif text-4xl">How each part went</h2>
        <div className="mt-6 divide-y divide-ground-3">
          {debrief.dimensions.map((d) => (
            <article key={d.id} data-reveal className="grid gap-3 py-6 sm:grid-cols-[14rem_1fr]">
              <div>
                <p className="text-lg">{d.name}</p>
                <div className="mt-2 flex items-center gap-1.5" aria-label={LEVEL[d.level].label}>
                  {[1, 2, 3].map((n) => (
                    <span key={n} className="h-1.5 w-8 rounded-full" style={{ background: n <= LEVEL[d.level].n ? (d.level === "not_yet" ? "var(--bad)" : d.level === "standout" ? "var(--good)" : "var(--warn)") : "var(--ground-3)" }} />
                  ))}
                  <span className="ml-2 text-sm text-ink-2">{LEVEL[d.level].label}</span>
                </div>
              </div>
              <div>
                <p className="leading-relaxed text-ink">{d.note}</p>
                {d.evidence.map((q) => (
                  <blockquote key={q} className="mt-3 font-serif text-lg italic text-ink-2">“{q}”</blockquote>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {debrief.moments.length > 0 && (
        <section className="mt-16">
          <h2 data-reveal className="font-serif text-4xl">The moments that mattered</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {debrief.moments.map((m) => (
              <article key={m.quote} data-reveal className="rounded-2xl bg-ground-2 p-6">
                <p className="text-sm text-ink-3">{mmss(m.t)}</p>
                <h3 className="mt-1 text-lg">{m.title}</h3>
                <blockquote className="mt-3 font-serif italic text-ink-2">“{m.quote}”</blockquote>
                <p className="mt-4 text-ink"><span className="text-ink-3">Stronger: </span>{m.better}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <div data-reveal className="rounded-2xl bg-ground-2 p-6">
          <h2 className="font-serif text-3xl">Drills for this week</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-2">
            {debrief.drills.map((d) => <li key={d}>{d}</li>)}
          </ol>
        </div>
        <div data-reveal className="rounded-2xl bg-ground-2 p-6">
          <h2 className="font-serif text-3xl">Case log</h2>
          <p className="mt-4 break-words text-sm leading-relaxed text-ink-2">{logRow}</p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(logRow).then(() => setCopied(true), () => {});
            }}
            className="mt-4 rounded-full bg-ground-3 px-4 py-2 text-sm"
          >
            {copied ? "Copied" : "Copy row"}
          </button>
        </div>
      </section>

      <details className="mt-16 rounded-2xl bg-ground-2 p-6" data-reveal>
        <summary className="cursor-pointer font-serif text-2xl">Full transcript</summary>
        <div className="mt-4 space-y-3 text-sm">
          {state.transcript.map((t, i) => (
            <p key={i} className={t.role === "interviewer" ? "text-ink-2" : "text-ink"}>
              <span className="text-ink-3">{mmss(t.t)} {t.role === "interviewer" ? "Alex" : "You"}: </span>
              {t.text}
            </p>
          ))}
        </div>
      </details>
    </main>
  );
}
