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

const STEPS = [
  { h: "It holds the data back.", p: "Ask the right question and you get the fact. Ask the wrong one and you get a question back." },
  { h: "It lets the silence happen.", p: "Ask for a moment to structure and the room goes still. No timer on screen, just like the real one." },
  { h: "It slides the exhibit across.", p: "Each exhibit arrives when its part of the case begins. Never before, so there is nothing to peek at." },
  { h: "It finds where the math broke.", p: "Numbers are checked by code. A wrong answer gets the question a real interviewer would ask." },
  { h: "Then it tells you the truth.", p: "Would you have advanced? Graded on three levels, like the firms do, with your own words as evidence." },
];

const STRIP = ["Profitability", "Market entry", "Candidate-led", "Interviewer-led", "Exhibits", "Case math", "Brainstorming", "The recommendation"];

export function Landing({ cases }: { cases: CaseSummary[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero: the headline rises letter by letter.
        const split = SplitText.create("[data-hero-title]", { type: "chars,words", mask: "chars" });
        gsap.from(split.chars, { yPercent: 110, rotate: 6, duration: 1.1, ease: "expo.out", stagger: 0.022, delay: 0.15 });
        gsap.from("[data-hero-fade]", { opacity: 0, y: 24, duration: 1, ease: "power3.out", stagger: 0.12, delay: 0.7 });

        // Alex speaks the prompt word by word, the light swelling with each word.
        const words = SplitText.create("[data-prompt]", { type: "words" });
        gsap.set(words.words, { opacity: 0.12 });
        const light = document.querySelector<HTMLElement>("[data-hero-light] .aurora");
        const speak = gsap.timeline({ delay: 1.4 });
        words.words.forEach((w, i) => {
          speak.to(w, { opacity: 1, duration: 0.25, ease: "power1.out" }, i * 0.16);
          if (light) speak.fromTo(light, { "--energy": 0.85 }, { "--energy": 0.35, duration: 0.3, ease: "power2.out", immediateRender: false }, i * 0.16);
        });

        // The light follows the cursor, lazily.
        const wrap = document.querySelector<HTMLElement>("[data-hero-light]");
        if (wrap) {
          const xTo = gsap.quickTo(wrap, "x", { duration: 1.6, ease: "power3.out" });
          const yTo = gsap.quickTo(wrap, "y", { duration: 1.6, ease: "power3.out" });
          const move = (e: PointerEvent) => {
            xTo((e.clientX / window.innerWidth - 0.5) * 80);
            yTo((e.clientY / window.innerHeight - 0.5) * 60);
          };
          window.addEventListener("pointermove", move);
          gsap.to("[data-hero-light]", { scale: 1.25, opacity: 0.35, ease: "none", scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true } });
          return () => window.removeEventListener("pointermove", move);
        }
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The room: one pinned stage, five beats, driven by scroll.
        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: { trigger: "[data-room]", start: "top top", end: "+=520%", scrub: 1, pin: true },
        });
        const step = (i: number) => `[data-step="${i}"]`;
        const showStep = (i: number, at: number | string) => {
          // the old heading clears before the new one arrives, so they never overlap
          if (i > 0) tl.to(step(i - 1), { opacity: 0, y: -40, duration: 0.3 }, at);
          tl.fromTo(step(i), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45 }, typeof at === "string" ? `${at}+=0.32` : at + 0.32);
        };
        gsap.set("[data-step]", { opacity: 0 });
        gsap.set(step(0), { opacity: 1, y: 0 });

        // 1. held back: the question lands, one fact unredacts, the rest stay hidden
        tl.from("[data-ask]", { opacity: 0, x: -40, duration: 0.5 })
          .to("[data-fact='0'] [data-bar]", { scaleX: 0, transformOrigin: "right center", duration: 0.5 })
          .from("[data-fact='0'] [data-text]", { opacity: 0, duration: 0.4 }, "<0.2")
          .to("[data-vis='facts']", { opacity: 1, duration: 0.6 })
          .addLabel("silence");

        // 2. silence: the room dims to one ember
        showStep(1, "silence");
        tl.to("[data-vis='facts']", { opacity: 0, scale: 0.96, duration: 0.5 }, "silence")
          .to("[data-dim]", { opacity: 0.82, duration: 0.6 }, "silence")
          .to("[data-room-light] .aurora", { "--energy": 0.08, scale: 0.7, duration: 0.8 }, "silence")
          .fromTo("[data-vis='silence']", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "silence+=0.3")
          .to({}, { duration: 0.6 })
          .addLabel("exhibit");

        // 3. the exhibit slides across the table
        showStep(2, "exhibit");
        tl.to("[data-dim]", { opacity: 0, duration: 0.4 }, "exhibit")
          .to("[data-vis='silence']", { opacity: 0, duration: 0.3 }, "exhibit")
          .to("[data-room-light] .aurora", { "--energy": 0.5, scale: 1, duration: 0.5 }, "exhibit")
          .fromTo("[data-vis='exhibit']", { opacity: 0, x: 260, y: -120, rotate: 9 }, { opacity: 1, x: 0, y: 0, rotate: -2, duration: 0.9, ease: "power3.out" }, "exhibit+=0.1")
          .to("[data-vis='exhibit']", { rotate: 0, duration: 0.3, ease: "back.out(2)" })
          .from("[data-vis='exhibit'] tbody tr", { opacity: 0, x: 16, stagger: 0.06, duration: 0.3 }, "<-0.2")
          .to("[data-labour] > td", { backgroundColor: "rgba(240, 169, 91, 0.42)", duration: 0.5 })
          .addLabel("math");

        // 4. the math: a wrong number is struck out, the probe, the right one
        showStep(3, "math");
        tl.to("[data-vis='exhibit']", { opacity: 0, x: -200, rotate: -6, duration: 0.6, ease: "power2.in" }, "math")
          .fromTo("[data-vis='math']", { opacity: 0 }, { opacity: 1, duration: 0.3 }, "math+=0.3")
          .from("[data-wrong]", { opacity: 0, y: 30, duration: 0.4 })
          .to("[data-strike]", { scaleX: 1, duration: 0.4, ease: "power3.in" })
          .to("[data-wrong-num]", { opacity: 0.3, duration: 0.3 })
          .from("[data-probe]", { opacity: 0, y: 16, duration: 0.4 })
          .from("[data-right]", { opacity: 0, y: 30, scale: 0.92, duration: 0.5, ease: "back.out(1.6)" })
          .addLabel("verdict");

        // 5. the verdict
        showStep(4, "verdict");
        tl.to("[data-vis='math']", { opacity: 0, y: -30, duration: 0.4 }, "verdict")
          .fromTo("[data-vis='verdict']", { opacity: 0 }, { opacity: 1, duration: 0.3 }, "verdict+=0.2")
          .from("[data-verdict-word]", { yPercent: 100, opacity: 0, stagger: 0.12, duration: 0.6, ease: "expo.out" })
          .from("[data-meter] > span", { scaleX: 0, transformOrigin: "left center", stagger: 0.05, duration: 0.3 }, "<0.2")
          .to("[data-room-light] .aurora", { "--energy": 0.9, scale: 1.15, duration: 0.6 }, "<")
          .to({}, { duration: 0.5 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Two minds: the director's sheet stays readable, Alex's copy is redacted line by line.
        gsap.from("[data-mind]", { opacity: 0, y: 60, stagger: 0.15, duration: 1, ease: "power3.out", scrollTrigger: { trigger: "[data-minds]", start: "top 75%" } });
        gsap.from("[data-redact]", { scaleX: 0, transformOrigin: "left center", stagger: 0.12, duration: 0.6, ease: "power2.out", scrollTrigger: { trigger: "[data-minds]", start: "top 55%" } });
        gsap.fromTo("[data-scan]", { yPercent: -100 }, { yPercent: 1100, duration: 2.6, ease: "none", repeat: -1, repeatDelay: 0.8 });

        // The strip: drifts on its own, speeds up with scroll velocity.
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

        // Numbers count up.
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const end = Number(el.dataset.count);
          const o = { v: 0 };
          gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" }, onUpdate: () => (el.textContent = String(Math.round(o.v))) });
        });

        gsap.from("[data-close-word]", { yPercent: 100, stagger: 0.08, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "[data-close]", start: "top 85%" } });
      });

      // Reduced motion: no pin and no scrub. The room shows one still frame, the verdict.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-step], [data-vis]", { opacity: 0 });
        gsap.set("[data-step='4'], [data-vis='verdict']", { opacity: 1 });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

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
      <section data-hero className="relative flex min-h-dvh flex-col">
        <div data-hero-light className="pointer-events-none absolute right-[-12vmin] top-[8vh] z-0 w-[min(92vmin,58rem)] opacity-90 max-lg:right-[-30vmin] max-lg:top-[14vh]">
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
            <div data-hero-fade className="rounded-2xl bg-ground-2/70 p-5 sm:p-6">
              <p className="text-sm text-ink-3">Alex, reading the prompt</p>
              <p data-prompt className="mt-2 font-serif text-xl leading-snug sm:text-2xl">{PROMPT}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={hear} className="rounded-full bg-lamp px-5 py-2.5 font-semibold text-ground">
                  {speaking ? "Stop" : "Hear Alex"}
                </button>
                <a href="#start" className="rounded-full bg-ground-3 px-5 py-2.5 text-ink">Answer it yourself</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE ROOM: pinned, five beats */}
      <section data-room className="relative h-dvh overflow-hidden bg-ground-2">
        <div data-dim className="pointer-events-none absolute inset-0 z-20 bg-black opacity-0" />
        <div className="relative z-30 mx-auto grid h-full max-w-7xl items-center gap-8 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative h-[34vh] lg:h-[50vh]">
            <div data-room-light className="absolute -left-6 -top-10 w-28 sm:w-36">
              <Aurora presence="listening" level={0} pulse={0} className="w-full" />
            </div>
            {STEPS.map((s, i) => (
              <div key={s.h} className="absolute inset-0 flex items-center">
               <div data-step={i}>
                <h2 className="font-serif text-[clamp(2.4rem,5.4vw,5.2rem)] leading-[0.95] tracking-[-0.035em]">{s.h}</h2>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">{s.p}</p>
               </div>
              </div>
            ))}
          </div>

          <div className="relative h-[46vh] lg:h-[70vh]">
            {/* 1. facts */}
            <div data-vis="facts" className="absolute inset-0 flex flex-col justify-center gap-4">
              <p data-ask className="self-start rounded-2xl rounded-bl-sm bg-ground-3 px-5 py-3 text-lg">What does Maya want, and by when?</p>
              <div className="rounded-2xl bg-ground p-6">
                {["Back to $6M operating profit within two years.", "Food revenue grew about 20% after a menu expansion.", "Labour costs rose from $14.0M to $16.6M.", "The menu went from 12 to 30 items."].map((f, i) => (
                  <div key={f} data-fact={i} className="relative py-3 text-lg">
                    <span data-text className={i === 0 ? "text-ink" : "invisible"}>{f}</span>
                    <span data-bar className="absolute inset-y-3 left-0 rounded-sm bg-ink-3/40" style={{ width: `${[78, 64, 70, 52][i]}%` }} />
                  </div>
                ))}
              </div>
              <p className="text-ink-3">Three more facts are in the case. You have to ask for them.</p>
            </div>

            {/* 2. silence */}
            <div data-vis="silence" className="absolute inset-0 flex flex-col items-center justify-center opacity-0">
              <p className="font-serif text-[clamp(2.5rem,6vw,5.5rem)] italic text-ink">Take your time.</p>
              <p className="mt-4 text-ink-3">Alex waits. So does the room.</p>
            </div>

            {/* 3. exhibit */}
            <div className="absolute inset-0 flex items-center justify-center">
            <div data-vis="exhibit" className="sheet w-full max-w-xl rounded-[3px] p-6 opacity-0 sm:p-8">
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
            <div data-vis="math" className="absolute inset-0 flex flex-col justify-center opacity-0">
              <p className="text-ink-3">If labour had grown with revenue, what would profit have been?</p>
              <div data-wrong className="relative mt-6 self-start">
                <span data-wrong-num className="font-serif text-[clamp(4rem,10vw,8rem)] leading-none">$2.6M</span>
                <span data-strike className="absolute left-[-4%] top-1/2 h-[0.09em] w-[108%] origin-left scale-x-0 rounded-full bg-[var(--bad)] text-[clamp(4rem,10vw,8rem)]" />
              </div>
              <p data-probe className="mt-6 max-w-md rounded-2xl rounded-bl-sm bg-ground-3 px-5 py-3 text-lg">Can you walk me through how you got there?</p>
              <p data-right className="mt-8 font-serif text-[clamp(4rem,10vw,8rem)] leading-none text-[var(--good)]">$5.5M</p>
              <p className="mt-3 text-ink-2">Labour explains about three quarters of the drop.</p>
            </div>

            {/* 5. verdict */}
            <div data-vis="verdict" className="absolute inset-0 flex flex-col justify-center opacity-0">
              <p className="overflow-hidden font-serif text-[clamp(4rem,11vw,10rem)] leading-[0.9] tracking-[-0.04em] text-[var(--good)]">
                <span data-verdict-word className="inline-block">Would</span>{" "}
                <span data-verdict-word className="inline-block">advance</span>
              </p>
              <div className="mt-10 grid max-w-lg gap-4">
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

      {/* TWO MINDS */}
      <section data-minds className="mx-auto max-w-7xl px-4 py-32 sm:px-8 sm:py-44">
        <h2 className="max-w-6xl font-serif text-[clamp(2.4rem,5.6vw,5.4rem)] leading-[0.95] tracking-[-0.035em]">One mind knows the answers. The other talks.</h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
          A hidden director reads the whole answer key and decides what you have earned. Alex, the voice, only ever knows what has
          been unlocked. Every line is checked for an unearned answer before you hear it.
        </p>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div data-mind className="sheet rounded-[3px] p-7">
            <p className="font-serif text-paper-ink-2">What the director sees</p>
            <ul className="mt-4 space-y-3 text-[17px]">
              <li>Expected answer: excess labour about $1.5M</li>
              <li>Profit if labour grew 8%: about $5.5M</li>
              <li>Insight: the menu went from 12 to 30 items</li>
              <li>Hint 3: start from 14.0 grown by 8%</li>
              <li>Recommendation: trim the menu, staff to demand</li>
            </ul>
          </div>
          <div data-mind className="relative overflow-hidden rounded-[3px] bg-ground-3 p-7">
            <span data-scan className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--lamp)_22%,transparent),transparent)]" />
            <p className="font-serif text-ink-2">What Alex can say</p>
            <ul className="mt-4 space-y-3 text-[17px]">
              {[["Expected answer: ", 46], ["Profit if labour grew 8%: ", 30], ["Insight: ", 62], ["Hint 3: ", 54], ["Recommendation: ", 58]].map(([label, w]) => (
                <li key={label} className="flex items-center gap-2 text-ink-2">
                  {label}
                  <span data-redact className="inline-block h-[1.1em] rounded-sm bg-ink-3/45" style={{ width: `${w}%` }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* STRIP */}
      <section data-strip className="overflow-hidden py-10" aria-hidden>
        <div data-strip-inner className="flex w-max gap-12 whitespace-nowrap">
          {[...STRIP, ...STRIP].map((s, i) => (
            <span key={i} className={`font-serif text-[clamp(3.5rem,9vw,8.5rem)] leading-none tracking-[-0.03em] ${i % 2 ? "text-lamp" : "text-ink-3/50"}`}>
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* NUMBERS, all true of this build */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-28 sm:grid-cols-3 sm:px-8">
        {[
          [8, "dimensions scored, from the opening to the recommendation"],
          [3, "levels, the way consulting firms rate: not yet, good enough, standout"],
          [0, "answers leaked across 30 attempts to pry them out, in our tests"],
        ].map(([n, t]) => (
          <div key={String(t)}>
            <p data-count={n} className="font-serif text-[clamp(5rem,12vw,10rem)] leading-none tracking-[-0.04em]">{n}</p>
            <p className="mt-3 max-w-xs text-lg text-ink-2">{t}</p>
          </div>
        ))}
      </section>

      {/* START */}
      <section id="start" className="relative mx-auto grid max-w-7xl scroll-mt-8 items-center gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="font-serif text-[clamp(2.6rem,6vw,5.8rem)] leading-[0.95] tracking-[-0.035em]">Alex is ready when you are.</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
            About 25 minutes. Use Chrome or Edge on a laptop for voice, or type. Pen and paper help. No calculator, like the real
            thing.
          </p>
        </div>
        <StartForm cases={cases} />
      </section>

      {/* CLOSE */}
      <footer data-close className="mx-auto max-w-7xl overflow-hidden px-4 pb-10 pt-24 sm:px-8">
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
