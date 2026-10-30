import { listCases } from "@/lib/case/library";
import { StartForm } from "@/components/StartForm";

export default function Home() {
  const cases = listCases();
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="font-serif text-xl tracking-tight">Case Partner</span>
      </header>

      <section className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.15fr_1fr] lg:py-0">
        <div>
          <h1 className="font-serif text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.95] tracking-[-0.03em]">
            Case practice
            <br />
            that talks back.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-2">
            An AI interviewer that runs a consulting case out loud. It holds the data back until you ask for it, puts each
            exhibit in front of you when it is time, probes your math, and ends by telling you whether you would have
            advanced.
          </p>
          <ul className="mt-10 grid max-w-xl gap-5 text-ink-2 sm:grid-cols-3">
            <li><span className="block font-serif text-2xl text-ink">Voice</span>Talk it through, like the real room.</li>
            <li><span className="block font-serif text-2xl text-ink">Exhibits</span>Shown when earned, never before.</li>
            <li><span className="block font-serif text-2xl text-ink">Verdict</span>With quotes from your own case.</li>
          </ul>
        </div>

        <StartForm cases={cases} />
      </section>

      <footer className="py-8 text-sm text-ink-3">
        Practice tool, not affiliated with any consulting firm. What you say is sent to the AI model only to run and score
        this session, and nothing is stored.
      </footer>
    </main>
  );
}
