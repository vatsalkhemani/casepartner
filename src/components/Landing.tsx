"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import type { CaseSummary } from "@/lib/case/library";
import { Aurora } from "./Aurora";
import { StartForm } from "./StartForm";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const PROMPT =
  "Your client is Lantern Coffee, a chain of 40 cafés across the Pacific Northwest. Last year revenue grew 8 percent, but operating profit fell from 6 million to 4 million. Why?";

const BEATS = [
  { name: "Clarify", h: "It holds the data back.", p: "Ask the right question and you get the fact. Ask the wrong one and you get a question back." },
  { name: "Structure", h: "It lets the silence happen.", p: "Ask for a moment and the room goes still. No timer on screen, like the real one." },
  { name: "Exhibit", h: "It slides the exhibit across.", p: "Each exhibit arrives when its part of the case begins. Never before." },
  { name: "Math", h: "It finds where the math broke.", p: "Numbers are checked by code. A wrong answer gets the question a real interviewer would ask." },
  { name: "Verdict", h: "Then it tells you the truth.", p: "Would you have advanced? Three levels, like the firms, with your own words as evidence." },
];

const STRIP = ["Profitability", "Market entry", "Candidate-led", "Interviewer-led", "Exhibits", "Case math", "Brainstorming", "The recommendation"];

export function Landing({ cases }: { cases: CaseSummary[] }) {
  const root = useRef<HTMLDivElement>(null);
  const film = useRef<gsap.core.Timeline | null>(null);
  const [pulse, setPulse] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [beat, setBeat] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // HERO: the headline rises once; the prompt fades in word by word while
        // the light breathes slowly. No per-word flashing.
        const title = SplitText.create("[data-hero-title]", { type: "chars,words", mask: "chars" });
        gsap.from(title.chars, { yPercent: 110, rotate: 6, duration: 1.1, ease: "expo.out", stagger: 0.022, delay: 0.15 });
        gsap.from("[data-hero-fade]", { opacity: 0, y: 24, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.7 });
        const words = SplitText.create("[data-prompt]", { type: "words" });
        gsap.fromTo(words.words, { opacity: 0.14 }, { opacity: 1, duration: 0.5, ease: "power1.out", stagger: 0.11, delay: 1.3 });
        gsap.fromTo("[data-hero-light] .aurora", { "--energy": 0.22 }, { "--energy": 0.5, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.3 });

        const wrap = document.querySelector<HTMLElement>("[data-hero-light]");
        if (wrap) {
          const xTo = gsap.quickTo(wrap, "x", { duration: 1.8, ease: "power3.out" });
          const yTo = gsap.quickTo(wrap, "y", { duration: 1.8, ease: "power3.out" });
          const move = (e: PointerEvent) => {
            xTo((e.clientX / window.innerWidth - 0.5) * 70);
            yTo((e.clientY / window.innerHeight - 0.5) * 50);
          };
          window.addEventListener("pointermove", move);
          return () => window.removeEventListener("pointermove", move);
        }
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // THE ROOM: a short film that plays itself. It starts when the section
        // comes into view, pauses when it leaves, and loops. No scroll-jacking.
        const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.4, defaults: { ease: "power2.inOut" } });
        film.current = tl;
        const light = "[data-room-light] .aurora";
        const head = (i: number) => `[data-beat="${i}"]`;
        const hold = (s: number) => tl.to({}, { duration: s });
        const swap = (i: number) => {
          tl.addLabel(`b${i}`);
          if (i > 0) tl.to(head(i - 1), { opacity: 0, y: -24, duration: 0.35 });
          tl.fromTo(head(i), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, i > 0 ? ">-0.05" : 0);
        };
        gsap.set("[data-beat], [data-vis]", { opacity: 0 });

        // 1. clarify
        swap(0);
        tl.fromTo("[data-vis='facts']", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "<")
          .fromTo("[data-ask]", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" })
          .fromTo("[data-fact='0'] [data-bar]", { scaleX: 1 }, { scaleX: 0, transformOrigin: "right center", duration: 0.6 }, "+=0.3")
          .fromTo("[data-fact='0'] [data-text]", { opacity: 0 }, { opacity: 1, duration: 0.4 }, "<0.25");
        hold(1.6);

        // 2. structure: the room dims to an ember
        swap(1);
        tl.to("[data-vis='facts']", { opacity: 0, y: -16, duration: 0.4 }, "<")
          .to("[data-dim]", { opacity: 0.75, duration: 0.8 }, "<")
          .to(light, { "--energy": 0.06, scale: 0.75, duration: 1 }, "<")
          .fromTo("[data-vis='silence']", { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 1.2, ease: "sine.out" }, "<0.4");
        hold(1.8);

        // 3. exhibit: the sheet slides across and settles
        swap(2);
        tl.to("[data-dim]", { opacity: 0, duration: 0.5 }, "<")
          .to("[data-vis='silence']", { opacity: 0, duration: 0.3 }, "<")
          .to(light, { "--energy": 0.5, scale: 1, duration: 0.6 }, "<")
          .fromTo("[data-vis='exhibit']", { opacity: 0, x: 240, y: -100, rotate: 9 }, { opacity: 1, x: 0, y: 0, rotate: -2, duration: 0.9, ease: "power3.out" }, "<0.1")
          .to("[data-vis='exhibit']", { rotate: 0, duration: 0.35, ease: "back.out(2)" })
          .fromTo("[data-vis='exhibit'] tbody tr", { opacity: 0, x: 14 }, { opacity: 1, x: 0, stagger: 0.06, duration: 0.3 }, "<-0.25")
          .fromTo("[data-labour] > td", { backgroundColor: "rgba(240,169,91,0)" }, { backgroundColor: "rgba(240,169,91,0.42)", duration: 0.5 }, "+=0.2");
        hold(1.8);

        // 4. math: struck out, probed, corrected
        swap(3);
        tl.to("[data-vis='exhibit']", { opacity: 0, x: -160, rotate: -5, duration: 0.5, ease: "power2.in" }, "<")
          .fromTo("[data-vis='math']", { opacity: 0 }, { opacity: 1, duration: 0.3 })
          .fromTo("[data-wrong]", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4 })
          .fromTo("[data-strike]", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power3.in" }, "+=0.3")
          .fromTo("[data-wrong-num]", { opacity: 1 }, { opacity: 0.3, duration: 0.3 })
          .fromTo("[data-probe]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4 })
          .fromTo("[data-right]", { opacity: 0, y: 24, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" }, "+=0.5");
        hold(1.8);

        // 5. verdict, then a long hold before the loop
        swap(4);
        tl.to("[data-vis='math']", { opacity: 0, y: -24, duration: 0.4 }, "<")
          .fromTo("[data-vis='verdict']", { opacity: 0 }, { opacity: 1, duration: 0.3 })
          .fromTo("[data-bloom]", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.2, ease: "power2.out" }, "<")
          .fromTo("[data-verdict-word]", { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: "expo.out" }, "<")
          .fromTo("[data-meter] > span", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", stagger: 0.05, duration: 0.3 }, "<0.3")
          .to(light, { "--energy": 0.85, scale: 1.15, duration: 0.6 }, "<");
        hold(3);
        tl.to("[data-beat='4'], [data-vis='verdict']", { opacity: 0, duration: 0.5 });
        tl.to(light, { "--energy": 0.3, scale: 1, duration: 0.5 }, "<");

        // progress bars: which beat, and how far through it
        const starts = BEATS.map((_, i) => tl.labels[`b${i}`]);
        const ends = [...starts.slice(1), tl.duration()];
        tl.eventCallback("onUpdate", () => {
          const t = tl.time();
          let current = 0;
          starts.forEach((s, i) => { if (t >= s) current = i; });
          document.querySelectorAll<HTMLElement>("[data-progress]").forEach((bar, i) => {
            const p = i < current ? 1 : i > current ? 0 : (t - starts[i]) / (ends[i] - starts[i]);
            bar.style.transform = `scaleX(${p})`;
          });
          setBeat((b) => (b === current ? b : current));
        });

        ScrollTrigger.create({
          trigger: "[data-room]",
          start: "top 65%",
          end: "bottom 35%",
          onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
        });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-mind]", { opacity: 0, y: 50, stagger: 0.15, duration: 1, ease: "power3.out", scrollTrigger: { trigger: "[data-minds]", start: "top 75%" } });
        gsap.from("[data-redact]", { scaleX: 0, transformOrigin: "left center", stagger: 0.1, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: "[data-minds]", start: "top 60%" } });

        const strip = gsap.to("[data-strip-inner]", { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
        ScrollTrigger.create({
          trigger: "[data-strip]",
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
            gsap.to(strip, { timeScale: 1 + Math.abs(v), duration: 0.3, overwrite: true });
            gsap.to(strip, { timeScale: 1, duration: 1.2, delay: 0.3 });
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const end = Number(el.dataset.count);
          const o = { v: 0 };
          gsap.to(o, { v: end, duration: 1.4, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" }, onUpdate: () => (el.textContent = String(Math.round(o.v))) });
        });
        gsap.from("[data-close-word]", { yPercent: 100, stagger: 0.08, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "[data-close]", start: "top 90%" } });
      });

      // Reduced motion: no film. The room shows one still frame, the verdict.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-beat], [data-vis]", { opacity: 0 });
        gsap.set("[data-beat='4'], [data-vis='verdict'], [data-bloom]", { opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const jump = (i: number) => {
    const tl = film.current;
    if (!tl) return;
    // Render from the start up to the beat instantly, so earlier beats have
    // set things up, then play on.
    tl.pause().seek(0).seek(`b${i}`).play();
  };

  const hear = () => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(PROMPT);
    const v = synth.getVoices().find((x) => x.name === "Google UK English Male") ?? synth.getVoices().find((x) => x.lang.startsWith("en"));
    if (v) u.voice = v;
    u.rate = 1.03;
    u.onboundary = () => setPulse((p) => p + 1);
    u.onend = () => setSpeaking(false);
    setSpeaking(true);
    synth.cancel();
    synth.speak(u);
  };

  return (
    <div ref={root} className="overflow-x-clip">
      {/* HERO */}
      <section className="relative flex min-h-dvh flex-col">
        <div data-hero-light className="pointer-events-none absolute right-[-12vmin] top-[6vh] z-0 w-[min(94vmin,60rem)] max-lg:right-[-30vmin] max-lg:top-[14vh]">
          <Aurora presence={speaking ? "speaking" : "listening"} level={0} pulse={pulse} className="w-full" />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-8">
          <span className="font-serif text-xl tracking-tight">Case Partner</span>
          <a href="#start" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ground">Start a case</a>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-16 sm:px-8">
          <h1 data-hero-title className="font-serif text-[clamp(3.4rem,11.5vw,11.5rem)] leading-[0.86] tracking-[-0.045em]">
            Case practice
            <br />
            that talks back.
          </h1>
          <div className="mt-12 grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <p data-hero-fade className="max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
              An AI interviewer that runs a consulting case out loud, holds the data back until you earn it, and tells you whether
              you would have advanced.
            </p>
            <div data-hero-fade className="rounded-2xl bg-ground-2/60 p-5 backdrop-blur-md sm:p-6">
              <p className="text-sm text-ink-3">Alex, reading the prompt</p>
              <p data-prompt className="mt-2 font-serif text-xl leading-snug sm:text-2xl">{PROMPT}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={hear} className="rounded-full bg-lamp px-5 py-2.5 font-semibold text-ground">{speaking ? "Stop" : "Hear Alex"}</button>
                <a href="#start" className="rounded-full bg-ground-3 px-5 py-2.5 text-ink">Answer it yourself</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE ROOM: a self-playing film, one screen tall */}
      <section data-room className="lamp-pool relative flex min-h-dvh items-center overflow-hidden">
        <div data-dim className="pointer-events-none absolute inset-0 z-20 bg-black opacity-0" />
        <div className="relative z-30 mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div data-room-light className="mb-6 w-24 sm:w-28">
              <Aurora presence="listening" level={0} pulse={0} className="w-full" />
            </div>
            <div className="relative h-[15rem] sm:h-[17rem]">
              {BEATS.map((b, i) => (
                <div key={b.h} data-beat={i} className="absolute inset-x-0 top-0">
                  <h2 className="font-serif text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.95] tracking-[-0.035em]">{b.h}</h2>
                  <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">{b.p}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid max-w-md grid-cols-5 gap-2" role="tablist" aria-label="Moments in the case">
              {BEATS.map((b, i) => (
                <button key={b.name} role="tab" aria-selected={beat === i} onClick={() => jump(i)} className="group text-left">
                  <span className="block h-1 overflow-hidden rounded-full bg-ground-3">
                    <span data-progress className="block h-full origin-left rounded-full bg-lamp" style={{ transform: "scaleX(0)" }} />
                  </span>
                  <span className={`mt-2 block text-sm transition-colors ${beat === i ? "text-ink" : "text-ink-3 group-hover:text-ink-2"}`}>{b.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[28rem] sm:h-[32rem]">
            {/* 1. facts */}
            <div data-vis="facts" className="absolute inset-0 flex flex-col justify-center gap-4">
              <p data-ask className="self-start rounded-2xl rounded-bl-sm bg-ground-3 px-5 py-3 text-lg">What does Maya want, and by when?</p>
              <div className="rounded-2xl bg-ground/80 p-6">
                {["Back to $6M operating profit within two years.", "Food revenue grew about 20% after a menu expansion.", "Labour costs rose from $14.0M to $16.6M.", "The menu went from 12 to 30 items."].map((f, i) => (
                  <div key={f} data-fact={i} className="relative py-3 text-lg">
                    <span data-text className={i === 0 ? "text-ink" : "invisible"}>{f}</span>
                    <span data-bar className="absolute inset-y-3 left-0 rounded-sm bg-ink-3/40" style={{ width: `${[78, 64, 70, 52][i]}%` }} />
                  </div>
                ))}
              </div>
              <p className="text-ink-3">The rest of the facts are in the case. You have to ask for them.</p>
            </div>

            {/* 2. silence */}
            <div data-vis="silence" className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-serif text-[clamp(2.5rem,6vw,5.5rem)] italic text-ink">Take your time.</p>
              <p className="mt-4 text-ink-3">Alex waits. So does the room.</p>
            </div>

            {/* 3. exhibit */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div data-vis="exhibit" className="sheet w-full max-w-xl rounded-[3px] p-6 sm:p-8">
                <p className="font-serif text-paper-ink-2">Exhibit A</p>
                <h3 className="font-serif text-2xl sm:text-3xl">Lantern Coffee operating costs</h3>
                <p className="text-sm text-paper-ink-2">$ millions</p>
                <table className="mt-4 text-[15px]">
                  <thead><tr><th>Cost line</th><th className="text-right">Two years ago</th><th className="text-right">Last year</th></tr></thead>
                  <tbody>
                    {[["Drink ingredients", "8.0", "9.2"], ["Food ingredients", "4.4", "5.4"], ["Food waste", "0.5", "1.2"], ["Labour", "14.0", "16.6"], ["Rent and occupancy", "8.4", "8.6"], ["Total", "40.3", "46.0"]].map((r) => (
                      <tr key={r[0]} data-labour={r[0] === "Labour" ? "" : undefined}>
                        <td>{r[0]}</td>
                        <td className="text-right">{r[1]}</td>
                        <td className="text-right">{r[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. math */}
            <div data-vis="math" className="absolute inset-0 flex flex-col justify-center">
              <p className="text-ink-3">If labour had grown with revenue, what would profit have been?</p>
              <div data-wrong className="relative mt-6 self-start">
                <span data-wrong-num className="font-serif text-[clamp(4rem,9vw,7.5rem)] leading-none">$2.6M</span>
                <span data-strike className="absolute left-[-4%] top-1/2 h-[0.09em] w-[108%] origin-left scale-x-0 rounded-full bg-[var(--bad)] text-[clamp(4rem,9vw,7.5rem)]" />
              </div>
              <p data-probe className="mt-6 max-w-md self-start rounded-2xl rounded-bl-sm bg-ground-3 px-5 py-3 text-lg">Can you walk me through how you got there?</p>
              <p data-right className="mt-8 font-serif text-[clamp(4rem,9vw,7.5rem)] leading-none text-[var(--good)]">$5.5M</p>
              <p className="mt-3 text-ink-2">Labour explains about three quarters of the drop.</p>
            </div>

            {/* 5. verdict */}
            <div data-vis="verdict" className="absolute inset-0 flex flex-col justify-center">
              <div data-bloom className="bloom-good pointer-events-none absolute left-[-10%] top-[5%] h-[70%] w-[90%]" />
              <p className="relative overflow-hidden pb-2 font-serif text-[clamp(4rem,10vw,9rem)] leading-[0.9] tracking-[-0.04em] text-[var(--good)]">
                <span data-verdict-word className="inline-block">Would</span>{" "}
                <span data-verdict-word className="inline-block">advance</span>
              </p>
              <div className="relative mt-10 grid max-w-lg gap-4">
                {[["Structure", 2], ["Exhibits", 3], ["Math", 2], ["Recommendation", 3]].map(([name, n]) => (
                  <div key={name} className="flex items-center gap-4">
                    <span className="w-40 text-ink-2">{name}</span>
                    <span data-meter className="flex gap-1.5">
                      {[1, 2, 3].map((k) => (
                        <span key={k} className="block h-2 w-12 rounded-full" style={{ background: k <= Number(n) ? (n === 3 ? "var(--good)" : "var(--warn)") : "var(--ground-3)" }} />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TWO MINDS, with the numbers */}
      <section data-minds className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
        <h2 className="max-w-6xl font-serif text-[clamp(2.4rem,5.6vw,5.4rem)] leading-[0.95] tracking-[-0.035em]">One mind knows the answers. The other talks.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div data-mind className="sheet rounded-[3px] p-7">
            <p className="font-serif text-paper-ink-2">What the director sees</p>
            <ul className="mt-4 space-y-3 text-[17px]">
              <li>Expected answer: excess labour about $1.5M</li>
              <li>Profit if labour grew 8%: about $5.5M</li>
              <li>Insight: the menu went from 12 to 30 items</li>
              <li>Recommendation: trim the menu, staff to demand</li>
            </ul>
          </div>
          <div data-mind className="rounded-[3px] bg-ground-3 p-7">
            <p className="font-serif text-ink-2">What Alex can say</p>
            <ul className="mt-4 space-y-3 text-[17px]">
              {[["Expected answer: ", 46], ["Profit if labour grew 8%: ", 30], ["Insight: ", 62], ["Recommendation: ", 58]].map(([label, w]) => (
                <li key={label} className="flex items-center gap-2 text-ink-2">
                  {label}
                  <span data-redact className="inline-block h-[1.1em] rounded-sm bg-ink-3/45" style={{ width: `${w}%` }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-20 grid gap-10 sm:grid-cols-3">
          {[
            [8, "dimensions scored, from the opening to the recommendation"],
            [3, "levels, the way consulting firms rate: not yet, good enough, standout"],
            [0, "answers leaked across 30 attempts to pry them out, in our tests"],
          ].map(([n, t]) => (
            <div key={String(t)}>
              <p data-count={n} className="font-serif text-[clamp(4.5rem,10vw,8.5rem)] leading-none tracking-[-0.04em]">{n}</p>
              <p className="mt-3 max-w-xs text-lg text-ink-2">{t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STRIP */}
      <section data-strip className="overflow-hidden py-6" aria-hidden>
        <div data-strip-inner className="flex w-max gap-12 whitespace-nowrap">
          {[...STRIP, ...STRIP].map((s, i) => (
            <span key={i} className={`font-serif text-[clamp(3.5rem,9vw,8.5rem)] leading-none tracking-[-0.03em] ${i % 2 ? "text-lamp" : "text-ink-3/50"}`}>{s}</span>
          ))}
        </div>
      </section>

      {/* START */}
      <section id="start" className="relative mx-auto grid max-w-7xl scroll-mt-8 items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-[clamp(2.6rem,6vw,5.8rem)] leading-[0.95] tracking-[-0.035em]">Alex is ready when you are.</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
            About 25 minutes. Use Chrome or Edge on a laptop for voice, or type. Pen and paper help. No calculator, like the real thing.
          </p>
        </div>
        <StartForm cases={cases} />
      </section>

      <footer data-close className="mx-auto max-w-7xl overflow-hidden px-4 pb-10 pt-16 sm:px-8">
        <p className="overflow-hidden font-serif text-[clamp(4rem,15vw,15rem)] leading-[0.85] tracking-[-0.05em]">
          <span data-close-word className="inline-block">Case</span> <span data-close-word className="inline-block">Partner</span>
        </p>
        <p className="mt-8 text-sm text-ink-3">
          Practice tool, not affiliated with any consulting firm. What you say is sent to the AI model only to run and score this
          session, and nothing is stored.
        </p>
      </footer>
    </div>
  );
}
