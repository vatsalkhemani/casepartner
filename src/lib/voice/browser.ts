"use client";

// Free voice using the browser's own speech engines. Quality is the floor,
// not the ceiling: VoiceIO is the seam where Gemini Live or ElevenLabs plug in.

export interface VoiceIO {
  supported: { listen: boolean; speak: boolean };
  listen(handlers: ListenHandlers): void;
  stopListening(): void;
  speak(text: string, onPulse?: () => void): Promise<void>;
  cancelSpeech(): void;
}

export type ListenHandlers = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void; // fired after the candidate pauses
  onError?: (message: string) => void;
};

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const PREFERRED_VOICES = [
  "Google UK English Male",
  "Google US English",
  "Microsoft Guy Online (Natural) - English (United States)",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Daniel",
  "Samantha",
  "Karen",
];

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((x) => x.name === name);
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en") && v.localService === false) ?? voices.find((v) => v.lang.startsWith("en"));
}

// Chrome stops long utterances after ~15 seconds, so speak sentence by sentence.
function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

export function createBrowserVoice(endOfTurnMs = 2200): VoiceIO {
  const Ctor = recognitionCtor();
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  let rec: Recognition | null = null;
  let wanted = false;
  let finalText = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let handlers: ListenHandlers | null = null;
  let speaking = false;

  const flush = () => {
    clearTimeout(timer);
    const text = finalText.trim();
    finalText = "";
    if (text && handlers) handlers.onFinal(text);
  };

  const begin = () => {
    if (!Ctor) return;
    rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += ` ${r[0].transcript}`;
        else interim += r[0].transcript;
      }
      handlers?.onInterim(`${finalText} ${interim}`.trim());
      clearTimeout(timer);
      timer = setTimeout(flush, interim ? endOfTurnMs + 600 : endOfTurnMs);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      handlers?.onError?.(e.error === "not-allowed" ? "Microphone access was blocked." : `Speech recognition error: ${e.error}`);
    };
    // Chrome ends recognition after a long silence. Keep listening while wanted:
    // silence while structuring is allowed.
    rec.onend = () => {
      if (wanted && !speaking) {
        try { begin(); } catch { /* restarted too fast; next end will retry */ }
      }
    };
    rec.start();
  };

  return {
    supported: { listen: !!Ctor, speak: canSpeak },
    listen(h) {
      handlers = h;
      wanted = true;
      finalText = "";
      if (!rec) begin();
    },
    stopListening() {
      wanted = false;
      clearTimeout(timer);
      finalText = "";
      const r = rec;
      rec = null;
      try { r?.abort(); } catch { /* already stopped */ }
    },
    async speak(text, onPulse) {
      if (!canSpeak) return;
      speaking = true;
      const synth = window.speechSynthesis;
      synth.cancel();
      const voice = pickVoice();
      for (const s of sentences(text)) {
        if (!speaking) break;
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(s);
          if (voice) u.voice = voice;
          u.rate = 1.03;
          u.pitch = 0.98;
          u.onboundary = () => onPulse?.();
          u.onend = () => resolve();
          u.onerror = () => resolve();
          synth.speak(u);
        });
      }
      speaking = false;
    },
    cancelSpeech() {
      speaking = false;
      if (canSpeak) window.speechSynthesis.cancel();
    },
  };
}

// Live microphone level, 0..1, for the interviewer's light to react to.
export async function micLevel(onLevel: (v: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const b of buf) sum += ((b - 128) / 128) ** 2;
    onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
}
