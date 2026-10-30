"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { CasePack } from "@/lib/case/schema";
import { detectNotice, findCases, locateCase, type CaseSpan, type Notice } from "@/lib/case/casebook";
import { openPdf, renderPage } from "@/lib/pdf";
import { deleteUpload, listUploads, saveUpload } from "@/lib/uploads";

type Stage = "drop" | "reading" | "pick" | "compiling" | "review";

const btn = "rounded-full px-5 py-2.5 font-semibold transition-colors";

export function Upload() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("drop");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const [notice, setNotice] = useState<Notice>({ kind: "none" });
  const [ownCopy, setOwnCopy] = useState(false);
  const [cases, setCases] = useState<CaseSpan[]>([]);
  const [query, setQuery] = useState("");
  const [span, setSpan] = useState<CaseSpan | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [pack, setPack] = useState<CasePack | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [format, setFormat] = useState<CasePack["meta"]["formats"][number]>("candidate_led");
  const [saved, setSaved] = useState<CasePack[]>([]);
  const doc = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    listUploads().then(setSaved, () => setSaved([]));
  }, []);

  // A small picture of the first page of the chosen range, so the user can see it is the right case.
  useEffect(() => {
    if (!span || !doc.current) return;
    let live = true;
    renderPage(doc.current, span.start, 520, 0.6).then((u) => live && setPreview(u), () => {});
    return () => { live = false; };
  }, [span]);

  const read = async (f: File) => {
    setFile(f);
    setError("");
    setStage("reading");
    try {
      const { doc: d, pages: p } = await openPdf(f, (done, total) => setProgress(`Reading page ${done} of ${total}`));
      doc.current = d;
      setPages(p);
      setNotice(detectNotice(p));
      setCases(findCases(p));
      setStage("pick");
    } catch {
      setError("That file couldn't be read as a PDF.");
      setStage("drop");
    }
  };

  const find = () => {
    const s = locateCase(pages, query, cases);
    if (s) setSpan(s);
    else setError(`Couldn't find "${query}" in the book. Try the name exactly as it's printed, or set the pages yourself.`);
  };

  const compile = async () => {
    if (!span || !doc.current || !file) return;
    setError("");
    setStage("compiling");
    try {
      const n = span.end - span.start + 1;
      const sent: { n: number; text: string; image: string }[] = [];
      for (let p = span.start; p <= span.end; p++) {
        setProgress(`Preparing page ${p - span.start + 1} of ${n}`);
        sent.push({ n: p, text: pages[p - 1], image: await renderPage(doc.current, p) });
      }
      setProgress("Alex is reading the case. This takes about a minute.");
      const res = await fetch("/api/compile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ book: file.name.replace(/\.pdf$/i, ""), caseTitle: span.title, pages: sent }) });
      const data = (await res.json()) as { pack?: CasePack; warnings?: string[]; error?: string };
      if (!res.ok || !data.pack) throw new Error(data.error ?? "The case couldn't be read.");
      // Exhibits are shown as the page they are printed on.
      const images = new Map(sent.map((s) => [s.n, s.image]));
      const withImages = { ...data.pack, exhibits: data.pack.exhibits.map((e) => ({ ...e, image: e.page ? images.get(e.page) : undefined })) };
      setPack(withImages);
      setWarnings(data.warnings ?? []);
      setFormat(withImages.meta.formats[0]);
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("pick");
    }
  };

  const start = async (p: CasePack, f = format) => {
    await saveUpload(p);
    router.push(`/room?upload=${encodeURIComponent(p.id)}&format=${f}&mode=voice`);
  };

  const blocked = notice.kind === "blocked";
  const canCompile = !!span && !blocked && (notice.kind !== "copyright" || ownCopy);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <a href="/" className="font-serif text-xl tracking-tight">Case Partner</a>
        <a href="/#start" className="rounded-full bg-ground-3 px-4 py-2 text-sm hover:bg-ground-2">Built-in cases</a>
      </header>

      <h1 className="mt-10 font-serif text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] tracking-[-0.035em]">Case from your casebook.</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
        Upload the PDF and tell Alex which case. The book is read in your browser. Only the pages of the case you pick are sent to the
        AI to set it up, and the result is saved in this browser, nowhere else.
      </p>

      {error && <p className="mt-6 rounded-2xl bg-[color-mix(in_oklab,var(--bad)_18%,transparent)] p-4 text-ink">{error}</p>}

      {stage === "drop" && (
        <>
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void read(f);
            }}
            className="mt-10 flex cursor-pointer flex-col items-center justify-center rounded-3xl bg-ground-2 px-6 py-20 text-center transition-colors hover:bg-ground-3"
          >
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} />
            <span className="font-serif text-3xl">Drop your casebook here</span>
            <span className="mt-2 text-ink-2">or click to choose a PDF</span>
          </label>

          {saved.length > 0 && (
            <section className="mt-14">
              <h2 className="font-serif text-3xl">Cases you set up before</h2>
              <ul className="mt-4 space-y-2">
                {saved.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 rounded-2xl bg-ground-2 p-4">
                    <div>
                      <p className="font-serif text-xl">{p.title}</p>
                      <p className="text-sm text-ink-3">{p.source.book} · {p.meta.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => void start(p, p.meta.formats[0])} className={`${btn} bg-lamp text-ground`}>Case me</button>
                      <button onClick={() => void deleteUpload(p.id).then(() => setSaved((s) => s.filter((x) => x.id !== p.id)))} className={`${btn} bg-ground-3 text-ink`}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {(stage === "reading" || stage === "compiling") && (
        <div className="mt-12 rounded-3xl bg-ground-2 p-10 text-center">
          <p className="font-serif text-3xl">{stage === "reading" ? "Reading the book…" : "Setting up the case…"}</p>
          <p className="mt-3 text-ink-2">{progress}</p>
        </div>
      )}

      {stage === "pick" && (
        <section className="mt-10 space-y-6">
          <p className="text-ink-2">{file?.name} · {pages.length} pages</p>

          {blocked && (
            <div className="rounded-2xl bg-[color-mix(in_oklab,var(--bad)_18%,transparent)] p-5">
              <p className="font-semibold">This book says it can&apos;t be used with AI tools.</p>
              <blockquote className="mt-2 font-serif italic text-ink-2">“{(notice as { quote: string }).quote}”</blockquote>
              <p className="mt-3 text-ink-2">So Alex won&apos;t read it. If the club that wrote it gives permission, ask them for a copy without that restriction.</p>
            </div>
          )}

          {notice.kind === "copyright" && (
            <label className="flex gap-3 rounded-2xl bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] p-5">
              <input type="checkbox" checked={ownCopy} onChange={(e) => setOwnCopy(e.target.checked)} className="mt-1" />
              <span>
                <span className="block">This book is copyrighted (“{notice.quote.slice(0, 120)}”). I have my own copy and this is for my own practice.</span>
              </span>
            </label>
          )}

          {!blocked && (
            <>
              <div>
                <h2 className="font-serif text-3xl">Which case?</h2>
                {cases.length > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {cases.map((c) => (
                      <button key={`${c.title}-${c.start}`} onClick={() => setSpan(c)} className={`rounded-2xl p-4 text-left transition-colors ${span?.start === c.start ? "bg-ground-3" : "bg-ground-2 hover:bg-ground-3/60"}`}>
                        <span className="block font-serif text-xl">{c.title}</span>
                        <span className="text-sm text-ink-3">Pages {c.start}–{c.end}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-ink-2">No numbered cases were found in this book. Type the case name as it&apos;s printed.</p>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setError("");
                  find();
                }}
                className="flex flex-wrap gap-2"
              >
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Or type the case name" className="min-w-0 flex-1 rounded-full bg-ground-2 px-5 py-3 text-ink placeholder:text-ink-3 focus:outline-none" />
                <button type="submit" className={`${btn} bg-ground-3 text-ink`}>Find it</button>
              </form>

              {span && (
                <div className="grid gap-6 rounded-3xl bg-ground-2 p-6 md:grid-cols-[1fr_14rem]">
                  <div>
                    <p className="font-serif text-2xl">{span.title}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-ink-2">
                      Pages
                      <input type="number" min={1} max={pages.length} value={span.start} onChange={(e) => setSpan({ ...span, start: Math.max(1, Math.min(Number(e.target.value), span.end)) })} className="w-20 rounded-lg bg-ground-3 px-3 py-2 text-ink" />
                      to
                      <input type="number" min={span.start} max={Math.min(pages.length, span.start + 24)} value={span.end} onChange={(e) => setSpan({ ...span, end: Math.max(span.start, Math.min(Number(e.target.value), pages.length, span.start + 24)) })} className="w-20 rounded-lg bg-ground-3 px-3 py-2 text-ink" />
                    </div>
                    <p className="mt-3 text-sm text-ink-3">Include the prompt, the interviewer notes, every exhibit and the answers. Up to 25 pages.</p>
                    <button disabled={!canCompile} onClick={() => void compile()} className={`${btn} mt-6 bg-lamp text-ground disabled:opacity-40`}>Set up this case</button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {preview && <img src={preview} alt={`First page of ${span.title}`} className="w-full rounded-[3px]" />}
                </div>
              )}
            </>
          )}
          <button onClick={() => { setStage("drop"); setSpan(null); setPages([]); setCases([]); }} className="text-ink-2 underline-offset-4 hover:underline">Use a different file</button>
        </section>
      )}

      {stage === "review" && pack && (
        <section className="mt-10 space-y-8">
          <div className="rounded-3xl bg-ground-2 p-6 sm:p-8">
            <p className="text-sm text-ink-3">{pack.source.book} · {pack.meta.type} · {pack.meta.industry}</p>
            <h2 className="mt-1 font-serif text-4xl">{pack.title}</h2>
            <p className="mt-4 font-serif text-xl leading-snug">{pack.prompt.readAloud}</p>
            <div className="mt-6 grid gap-4 text-ink-2 sm:grid-cols-3">
              <p><span className="block font-serif text-3xl text-ink">{pack.clarifyingFacts.length}</span>facts given if asked</p>
              <p><span className="block font-serif text-3xl text-ink">{pack.parts.length}</span>questions</p>
              <p><span className="block font-serif text-3xl text-ink">{pack.exhibits.length}</span>exhibits</p>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-2xl bg-[color-mix(in_oklab,var(--warn)_14%,transparent)] p-5">
              <p className="font-semibold">Worth a look before you start</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}

          <details open={showKey} onToggle={(e) => setShowKey((e.target as HTMLDetailsElement).open)} className="rounded-2xl bg-ground-2 p-5">
            <summary className="cursor-pointer">Check what Alex read (spoils the case)</summary>
            <ol className="mt-4 list-decimal space-y-4 pl-5">
              {pack.parts.map((p) => (
                <li key={p.id}>
                  <p className="text-ink">{p.question}</p>
                  <p className="text-sm text-ink-3">{p.kind}{p.exhibits.length ? ` · shows ${p.exhibits.join(", ")}` : ""}</p>
                  {p.expected.numeric.map((n) => <p key={n.id} className="text-sm text-ink-2">{n.label}: {n.value} {n.unit}</p>)}
                  {p.expected.insights.slice(0, 3).map((i) => <p key={i} className="text-sm text-ink-2">· {i}</p>)}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-3">
              {pack.exhibits.map((e) => (
                // eslint-disable-next-line @next/next/no-img-element
                e.image ? <img key={e.id} src={e.image} alt={e.label} className="w-40 rounded-[3px]" /> : <span key={e.id} className="rounded bg-paper px-3 py-2 text-sm text-paper-ink">{e.label}</span>
              ))}
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-3">
            {pack.meta.formats.length > 1 &&
              pack.meta.formats.map((f) => (
                <label key={f} className={`cursor-pointer rounded-full px-4 py-2 ${format === f ? "bg-ground-3 text-ink" : "text-ink-2"}`}>
                  <input type="radio" className="sr-only" checked={format === f} onChange={() => setFormat(f)} />
                  {f === "candidate_led" ? "Candidate-led" : "Interviewer-led"}
                </label>
              ))}
            <button onClick={() => void start(pack)} className={`${btn} bg-lamp text-ground`}>Start the case</button>
            <button onClick={() => setStage("pick")} className={`${btn} bg-ground-3 text-ink`}>Change pages</button>
          </div>
        </section>
      )}
    </main>
  );
}
