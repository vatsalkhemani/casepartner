"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export type Presence = "speaking" | "listening" | "thinking" | "quiet";

// The interviewer, drawn as light. Energy follows voice: the interviewer's
// speech pulses it, the candidate's mic level lifts it, silence lets it settle.
export function Aurora({ presence, level, pulse, className = "" }: { presence: Presence; level: number; pulse: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      const blobs = gsap.utils.toArray<HTMLElement>("i", root.current);
      blobs.forEach((b, i) => {
        gsap.to(b, {
          xPercent: gsap.utils.random(-9, 9),
          yPercent: gsap.utils.random(-9, 9),
          scale: gsap.utils.random(0.92, 1.1),
          rotate: gsap.utils.random(-25, 25),
          duration: 8 + i * 2.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      });
    },
    { scope: root },
  );

  // Base energy per state, lifted by the live signal.
  const base = presence === "speaking" ? 0.62 : presence === "thinking" ? 0.42 : presence === "listening" ? 0.3 : 0.16;
  useGSAP(
    () => {
      const target = Math.min(1, base + level * 0.5);
      gsap.to(root.current, { "--energy": target, duration: presence === "speaking" ? 0.25 : 0.6, ease: "power2.out", overwrite: "auto" });
    },
    { dependencies: [base, level, presence], scope: root },
  );

  // Each spoken word boundary gives a small swell.
  useGSAP(
    () => {
      if (!pulse) return;
      gsap.fromTo(root.current, { "--energy": Math.min(1, base + 0.3) }, { "--energy": base, duration: 0.45, ease: "power2.out", overwrite: "auto" });
    },
    { dependencies: [pulse], scope: root },
  );

  return (
    <div ref={root} className={`aurora ${presence === "thinking" ? "animate-pulse" : ""} ${className}`} aria-hidden>
      <i />
      <i />
      <i />
      <b />
    </div>
  );
}
