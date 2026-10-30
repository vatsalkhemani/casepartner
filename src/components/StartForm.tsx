"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseSummary } from "@/lib/case/library";

const FORMATS = [
  { id: "candidate_led", name: "Candidate-led", hint: "You drive and ask for data. BCG and Bain style." },
  { id: "interviewer_led", name: "Interviewer-led", hint: "The interviewer asks each question. McKinsey style." },
] as const;

export function StartForm({ cases }: { cases: CaseSummary[] }) {
  const router = useRouter();
  const [caseId, setCaseId] = useState(cases[0]?.id);
  const [format, setFormat] = useState<(typeof FORMATS)[number]["id"]>("candidate_led");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [voiceOk, setVoiceOk] = useState(true);
  const [voice, setVoice] = useState<"Charon" | "Kore">("Charon");

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const ok = !!(w.SpeechRecognition || w.webkitSpeechRecognition) && "speechSynthesis" in window;
    setVoiceOk(ok);
    if (!ok) setMode("text");
  }, []);

  const picked = cases.find((c) => c.id === caseId)!;

  return (
    <form
      className="rounded-2xl bg-ground-2 p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/room?case=${caseId}&format=${format}&mode=${mode}&voice=${voice}`);
      }}
    >
      <h2 className="font-serif text-3xl">Today&apos;s case</h2>
      <div className="mt-5 space-y-2">
        {cases.map((c) => (
          <label key={c.id} className={`block cursor-pointer rounded-xl p-4 transition-colors ${caseId === c.id ? "bg-ground-3" : "hover:bg-ground-3/60"}`}>
            <input type="radio" name="case" className="sr-only" checked={caseId === c.id} onChange={() => setCaseId(c.id)} />
            <span className="font-serif text-2xl">{c.title}</span>
            <span className="mt-1 block text-ink-2">{c.teaser}</span>
            <span className="mt-2 block text-sm text-ink-3">
              {c.meta.type} · {c.meta.industry} · about {c.meta.minutes} minutes · stretch: {c.meta.stretchArea.toLowerCase()}
            </span>
          </label>
        ))}
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm text-ink-2">Format</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FORMATS.filter((f) => picked.meta.formats.includes(f.id)).map((f) => (
            <label key={f.id} className={`cursor-pointer rounded-xl p-4 transition-colors ${format === f.id ? "bg-ground-3 text-ink" : "text-ink-2 hover:bg-ground-3/60"}`}>
              <input type="radio" name="format" className="sr-only" checked={format === f.id} onChange={() => setFormat(f.id)} />
              <span className="block font-medium">{f.name}</span>
              <span className="mt-1 block text-sm text-ink-3">{f.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm text-ink-2">How you answer</legend>
        <div className="mt-2 flex gap-2">
          {(["voice", "text"] as const).map((m) => (
            <label key={m} className={`flex-1 cursor-pointer rounded-xl p-3 text-center transition-colors ${mode === m ? "bg-ground-3 text-ink" : "text-ink-2 hover:bg-ground-3/60"} ${m === "voice" && !voiceOk ? "pointer-events-none opacity-40" : ""}`}>
              <input type="radio" name="mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} disabled={m === "voice" && !voiceOk} />
              {m === "voice" ? "Speak" : "Type"}
            </label>
          ))}
        </div>
        {!voiceOk && <p className="mt-2 text-sm text-ink-3">Voice needs Chrome or Edge on a laptop. You can type instead.</p>}
        {mode === "voice" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-2">
            Alex&apos;s voice
            {(["Charon", "Kore"] as const).map((v) => (
              <label key={v} className={`cursor-pointer rounded-full px-3 py-1.5 ${voice === v ? "bg-ground-3 text-ink" : "hover:bg-ground-3/60"}`}>
                <input type="radio" name="voice" className="sr-only" checked={voice === v} onChange={() => setVoice(v)} />
                {v === "Charon" ? "Deeper" : "Brighter"}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <button type="submit" className="mt-8 w-full rounded-full bg-lamp px-6 py-4 text-lg font-semibold text-ground transition-transform hover:scale-[1.01] active:scale-[0.99]">
        Start the case
      </button>
      <a href="/upload" className="mt-4 block rounded-xl bg-ground-3 p-4 text-center transition-colors hover:bg-ground">
        <span className="block font-medium">Or case from your own casebook</span>
        <span className="text-sm text-ink-3">Upload the PDF and pick the case</span>
      </a>
    </form>
  );
}
