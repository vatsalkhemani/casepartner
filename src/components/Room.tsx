"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Exhibit } from "@/lib/case/schema";
import type { SessionState } from "@/lib/interviewer/session";
import type { TurnEvent } from "@/lib/interviewer/engine";
import type { Debrief as DebriefData } from "@/lib/interviewer/debrief";
import { createBrowserVoice, micLevel, type VoiceIO } from "@/lib/voice/browser";
import type { CasePack } from "@/lib/case/schema";
import { forServer, getUpload } from "@/lib/uploads";
import { Aurora, type Presence } from "./Aurora";
import { ExhibitSheet } from "./ExhibitSheet";
import { Debrief } from "./Debrief";

type Props = { caseId: string; format: SessionState["format"]; mode: "voice" | "text"; title: string; uploaded?: boolean };
type TurnResponse = { state: SessionState; speech: string; events: TurnEvent[]; mode?: "model" | "rules" };
type Stage = "ready" | "live" | "selfgrade" | "scoring" | "debrief";

const STATUS: Record<Presence, string> = {
  speaking: "Alex is speaking",
  listening: "Listening",
  thinking: "Alex is thinking",
  quiet: "Take your time",
};

export function Room({ caseId, format, mode, title: givenTitle, uploaded }: Props) {
  const [stage, setStage] = useState<Stage>("ready");
  const [state, setState] = useState<SessionState | null>(null);
  const [presence, setPresence] = useState<Presence>("quiet");
  const [line, setLine] = useState("");
  const [interim, setInterim] = useState("");
  const [typed, setTyped] = useState("");
  const [captions, setCaptions] = useState(true);
  const [active, setActive] = useState<Exhibit | null>(null);
  const [seen, setSeen] = useState<Exhibit[]>([]);
  const [notes, setNotes] = useState("");
  const [level, setLevel] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [error, setError] = useState("");
  const [brain, setBrain] = useState<"model" | "rules">("rules");
  const [muted, setMuted] = useState(false);
  const [selfGrade, setSelfGrade] = useState<string>("");
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  // An uploaded case is read from this browser; the server gets it without images.
  const [pack, setPack] = useState<CasePack | null>(null);
  const packRef = useRef<CasePack | null>(null);
  packRef.current = pack;
  const title = pack?.title ?? givenTitle;
  useEffect(() => {
    if (!uploaded) return;
    getUpload(caseId).then(
      (p) => (p ? setPack(p) : setError("This case isn't saved in this browser. Upload it again.")),
      () => setError("This browser couldn't open its saved cases."),
    );
  }, [caseId, uploaded]);
  const packBody = () => (packRef.current ? { pack: forServer(packRef.current) } : {});

  const voice = useRef<VoiceIO | null>(null);
  const stopMic = useRef<(() => void) | null>(null);
  const stateRef = useRef<SessionState | null>(null);
  const busy = useRef(false);
  const mutedRef = useRef(false);
  stateRef.current = state;
  mutedRef.current = muted;

  // Notes survive a refresh, per case. Storage can be unavailable; that is fine.
  const notesKey = `notes:${caseId}`;
  useEffect(() => {
    try { setNotes(localStorage.getItem(notesKey) ?? ""); } catch { /* no storage */ }
  }, [notesKey]);
  useEffect(() => {
    try { localStorage.setItem(notesKey, notes); } catch { /* no storage */ }
  }, [notes, notesKey]);

  const applyEvents = (events: TurnEvent[]) => {
    for (const e of events) {
      if (e.type === "show_exhibit") {
        const local = packRef.current?.exhibits.find((x) => x.id === e.exhibit.id);
        const exhibit = local?.image ? { ...e.exhibit, image: local.image } : e.exhibit;
        setActive(exhibit);
        setSeen((s) => (s.some((x) => x.id === exhibit.id) ? s : [...s, exhibit]));
      }
    }
  };

  const listen = useCallback(() => {
    const v = voice.current;
    if (!v || mode !== "voice" || mutedRef.current) {
      setPresence(stateRef.current?.phase === "structuring" ? "quiet" : "listening");
      return;
    }
    setPresence(stateRef.current?.phase === "structuring" ? "quiet" : "listening");
    v.listen({
      onInterim: (t) => {
        setInterim(t);
        if (stateRef.current?.phase === "structuring") setPresence("listening");
      },
      onFinal: (t) => {
        // While structuring, ignore stray words; silence is allowed.
        if (stateRef.current?.phase === "structuring" && t.split(/\s+/).length < 4) return;
        void send(t);
      },
      onError: (m) => setError(m),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const say = useCallback(
    async (text: string) => {
      setLine(text);
      setPresence("speaking");
      if (mode === "voice" && voice.current?.supported.speak) {
        await voice.current.speak(text, () => setPulse((p) => p + 1));
      }
    },
    [mode],
  );

  const send = useCallback(
    async (text: string) => {
      const current = stateRef.current;
      if (!current || busy.current || !text.trim()) return;
      busy.current = true;
      voice.current?.stopListening();
      setInterim("");
      setPresence("thinking");
      setError("");
      // Show the candidate's words straight away.
      setState({ ...current, transcript: [...current.transcript, { role: "candidate", text, t: Date.now() - current.startedAt, phase: current.phase }] });
      try {
        const res = await fetch("/api/turn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: current, text, ...packBody() }) });
        if (!res.ok) throw new Error(`The interviewer didn't respond (${res.status}).`);
        const data = (await res.json()) as TurnResponse;
        stateRef.current = data.state; // listen() below must see the new phase before the next render
        setState(data.state);
        applyEvents(data.events);
        await say(data.speech);
        if (data.events.some((e) => e.type === "end") || data.state.phase === "ended") {
          finish();
          return;
        }
        busy.current = false;
        listen();
      } catch (e) {
        setState(current);
        setError(e instanceof Error ? e.message : "Something went wrong.");
        busy.current = false;
        listen();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listen, say],
  );

  const begin = async () => {
    setStage("live");
    if (mode === "voice") {
      voice.current = createBrowserVoice();
      try {
        stopMic.current = await micLevel((v) => setLevel(v));
      } catch {
        setError("Microphone access was blocked. You can type your answers instead.");
      }
    }
    setPresence("thinking");
    const res = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId, format, ...packBody() }) });
    const data = (await res.json()) as TurnResponse;
    setBrain(data.mode ?? "rules");
    stateRef.current = data.state;
    setState(data.state);
    await say(data.speech);
    listen();
  };

  const finish = () => {
    voice.current?.stopListening();
    voice.current?.cancelSpeech();
    stopMic.current?.();
    setPresence("quiet");
    setStage("selfgrade");
  };

  const score = async (grade: string) => {
    setSelfGrade(grade);
    setStage("scoring");
    const res = await fetch("/api/debrief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: stateRef.current, ...packBody() }) });
    setDebrief((await res.json()) as DebriefData);
    setStage("debrief");
  };

  useEffect(() => () => { voice.current?.stopListening(); voice.current?.cancelSpeech(); stopMic.current?.(); }, []);

  // Space sends what you have said so far; Escape stops the interviewer talking.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("textarea, input")) return;
      if (e.code === "Space" && interim) { e.preventDefault(); void send(interim); }
      if (e.key === "Escape") voice.current?.cancelSpeech();
      if (e.key.toLowerCase() === "c") setCaptions((c) => !c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interim, send]);

  if (stage === "debrief" && debrief && state) return <Debrief debrief={debrief} state={state} selfGrade={selfGrade} title={title} />;

  const candidateLast = [...(state?.transcript ?? [])].reverse().find((t) => t.role === "candidate")?.text;

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <a href="/" className="font-serif text-xl tracking-tight">Case Partner</a>
        <p className="hidden text-ink-2 sm:block">{title} · {format === "candidate_led" ? "Candidate-led" : "Interviewer-led"}</p>
        {stage === "live" ? (
          <button onClick={finish} className="rounded-full bg-ground-3 px-4 py-2 text-sm hover:bg-ground-2">End case</button>
        ) : <span />}
      </header>

      <div className="grid flex-1 gap-6 px-4 pb-6 sm:px-8 lg:grid-cols-[1fr_22rem]">
        {/* The table */}
        <section className="relative flex min-h-[70vh] flex-col overflow-hidden rounded-3xl bg-ground-2">
          <div className="relative flex flex-1 items-center justify-center">
          <div className={`flex flex-col items-center transition-all duration-700 ${active ? "absolute left-6 top-6 origin-top-left scale-[0.42]" : ""}`}>
            <button onClick={() => voice.current?.cancelSpeech()} title="Tap to stop Alex talking" className="rounded-full">
              <Aurora presence={presence} level={presence === "listening" ? level : 0} pulse={pulse} className="w-[min(46vw,20rem)]" />
            </button>
            {!active && (
              <div className="mt-6 text-center">
                <p className="font-serif text-2xl">Alex</p>
                <p className="text-ink-3">Engagement manager</p>
              </div>
            )}
          </div>

          {active && (
            <div className="relative z-10 flex w-full justify-center px-4 py-10 sm:px-10">
              <ExhibitSheet exhibit={active} onClose={() => setActive(null)} />
            </div>
          )}
          </div>

          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <p className="text-center text-sm text-ink-3" aria-live="polite">
              {stage === "live" ? (state?.phase === "structuring" && presence !== "speaking" && presence !== "thinking" ? "Your moment. Speak when you're ready." : STATUS[presence]) : ""}
            </p>
            {captions && line && stage === "live" && (
              <p className={`mx-auto mt-3 max-w-3xl text-center font-serif leading-snug text-ink ${line.length > 220 ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}>{line}</p>
            )}
            {interim && <p className="mx-auto mt-3 max-w-3xl text-center text-ink-2">“{interim}”</p>}
            {!interim && presence === "thinking" && candidateLast && <p className="mx-auto mt-3 max-w-3xl text-center text-ink-3">You: “{candidateLast}”</p>}
            {error && <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[var(--bad)]">{error}</p>}
          </div>

          {stage === "ready" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ground-2/85 p-6 text-center backdrop-blur-sm">
              <p className="font-serif text-4xl">Alex is ready for you.</p>
              <p className="mt-3 max-w-md text-ink-2">
                {mode === "voice"
                  ? "Speak naturally. Alex answers when you pause. Press space to send early, Escape to cut Alex off."
                  : "Type your answers. Alex will read the case to you and reply in text."}
              </p>
              <button onClick={() => void begin()} disabled={uploaded && !pack} className="mt-8 rounded-full bg-lamp px-8 py-4 text-lg font-semibold text-ground disabled:opacity-40">Begin</button>
            </div>
          )}
          {stage === "selfgrade" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-ground-2/90 p-6 text-center backdrop-blur-sm">
              <p className="font-serif text-4xl">Before you see the feedback,</p>
              <p className="mt-2 text-xl text-ink-2">how do you think that went?</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {[["A", "I'd advance"], ["B", "Close"], ["C", "Rough"], ["D", "Lost"]].map(([g, l]) => (
                  <button key={g} onClick={() => void score(g)} className="min-w-28 rounded-2xl bg-ground-3 px-5 py-4 hover:bg-ground">
                    <span className="block font-serif text-3xl">{g}</span>
                    <span className="text-sm text-ink-2">{l}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {stage === "scoring" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-ground-2/90">
              <p className="font-serif text-3xl">Alex is writing up your feedback…</p>
            </div>
          )}
        </section>

        {/* Your side of the table */}
        <aside className="flex flex-col gap-4">
          <label className="flex flex-1 flex-col rounded-3xl bg-ground-2 p-5">
            <span className="text-sm text-ink-2">Your notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Structure, numbers, hypotheses…"
              className="mt-2 min-h-56 flex-1 resize-none bg-transparent leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
            />
          </label>

          {seen.length > 0 && (
            <div className="rounded-3xl bg-ground-2 p-5">
              <p className="text-sm text-ink-2">Exhibits you&apos;ve seen</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {seen.map((e) => (
                  <button key={e.id} onClick={() => setActive(e)} className="rounded-[3px] bg-paper px-3 py-2 text-left text-paper-ink">
                    <span className="block font-serif text-sm">{e.label}</span>
                    <span className="block text-xs text-paper-ink-2">{e.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === "live" && (
            <div className="rounded-3xl bg-ground-2 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = typed.trim();
                  if (!t) return;
                  setTyped("");
                  void send(t);
                }}
                className="flex gap-2"
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={mode === "voice" ? "Or type here" : "Your answer"}
                  className="min-w-0 flex-1 rounded-full bg-ground-3 px-4 py-3 text-ink placeholder:text-ink-3 focus:outline-none"
                />
                <button type="submit" className="rounded-full bg-lamp px-4 font-semibold text-ground">Send</button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {mode === "voice" && (
                  <button
                    onClick={() => {
                      const m = !muted;
                      setMuted(m);
                      mutedRef.current = m;
                      if (m) voice.current?.stopListening();
                      else if (!busy.current) listen();
                    }}
                    className="rounded-full bg-ground-3 px-3 py-1.5"
                  >
                    {muted ? "Unmute mic" : "Mute mic"}
                  </button>
                )}
                {interim && <button onClick={() => void send(interim)} className="rounded-full bg-ground-3 px-3 py-1.5">Send now</button>}
                <button onClick={() => setCaptions((c) => !c)} className="rounded-full bg-ground-3 px-3 py-1.5">{captions ? "Hide captions" : "Show captions"}</button>
                <button onClick={() => setShowTranscript((s) => !s)} className="rounded-full bg-ground-3 px-3 py-1.5">Transcript</button>
              </div>
              <p className="mt-3 text-xs text-ink-3">{brain === "model" ? "Interviewer: AI model" : "Interviewer: built-in rules (add a Gemini key for the full AI interviewer)"}</p>
            </div>
          )}

          {showTranscript && state && (
            <div className="max-h-80 overflow-y-auto rounded-3xl bg-ground-2 p-5 text-sm">
              {state.transcript.map((t, i) => (
                <p key={i} className={`mb-3 ${t.role === "interviewer" ? "text-ink-2" : "text-ink"}`}>
                  <span className="text-ink-3">{t.role === "interviewer" ? "Alex" : "You"}: </span>
                  {t.text}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
