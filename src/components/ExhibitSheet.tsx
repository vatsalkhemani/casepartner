"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Exhibit } from "@/lib/case/schema";

// The signature move: the interviewer slides a sheet across the table.
export function ExhibitSheet({ exhibit, onClose }: { exhibit: Exhibit; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap
        .timeline()
        .from(ref.current, { y: -70, x: 40, rotate: -5, opacity: 0, scale: 0.94, duration: 0.75, ease: "power3.out" })
        .to(ref.current, { rotate: 0, duration: 0.35, ease: "back.out(2)" }, "-=0.2")
        .from(gsap.utils.toArray("tbody tr", ref.current), { opacity: 0, y: 6, stagger: 0.05, duration: 0.3, ease: "power2.out" }, "-=0.3");
    },
    { dependencies: [exhibit.id], scope: ref },
  );

  const { table } = exhibit;
  return (
    <div ref={ref} className="sheet w-full max-w-2xl rounded-[3px] p-6 sm:p-8" role="figure" aria-label={`${exhibit.label}: ${exhibit.title}`}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-serif text-lg text-paper-ink-2">{exhibit.label}</p>
        {onClose && (
          <button onClick={onClose} className="text-sm text-paper-ink-2 underline-offset-4 hover:underline">
            Put it aside
          </button>
        )}
      </div>
      <h3 className="mt-1 font-serif text-[1.75rem] leading-tight">{exhibit.title}</h3>
      {exhibit.image ? (
        // An uploaded casebook's exhibit is shown as the page itself: charts stay charts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={exhibit.image} alt={`${exhibit.label}: ${exhibit.title}`} className="mt-5 max-h-[60vh] w-full rounded-[2px] object-contain" />
      ) : table ? (
        <>
          {table.unit && <p className="mt-1 text-sm text-paper-ink-2">{table.unit}</p>}
          <div className="mt-5 overflow-x-auto">
            <table className="text-[15px]">
              <thead>
                <tr>{table.columns.map((c, i) => <th key={c} className={i ? "text-right" : ""}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={String(r[0])}>
                    {r.map((cell, i) => (
                      <td key={i} className={i ? "text-right" : ""}>
                        {typeof cell === "number" && table.unit?.includes("$") ? cell.toFixed(1) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.note && <p className="mt-4 text-[15px] text-paper-ink-2">{table.note}</p>}
        </>
      ) : null}
      {exhibit.source && <p className="mt-6 font-serif text-sm italic text-paper-ink-2">Source: {exhibit.source}</p>}
    </div>
  );
}
