"use client";

import { createBrowserVoice, type VoiceIO } from "./browser";

// Alex speaks with Gemini TTS; listening stays with the browser's recogniser,
// which in Chrome is already good. Every sentence of a line is requested at
// once and played in order, so only the first sentence's wait is felt. If a
// sentence's audio fails, the browser voice reads it instead.

export type Voice = "Charon" | "Kore" | "Orus" | "Aoede";

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}

export function createGeminiVoice(voice: Voice = "Charon"): VoiceIO & { prefetch(text: string): void; level(): number } {
  const browser = createBrowserVoice();
  const cache = new Map<string, Promise<ArrayBuffer | null>>();
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let current: AudioBufferSourceNode | null = null;
  let speaking = false;
  const buf = new Uint8Array(512);

  const fetchAudio = (s: string) => {
    if (!cache.has(s)) {
      cache.set(
        s,
        fetch("/api/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: s, voice }) })
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      );
    }
    return cache.get(s)!;
  };

  const audio = () => {
    if (!ctx) {
      ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.connect(ctx.destination);
    }
    return { ctx, analyser: analyser! };
  };

  const play = async (data: ArrayBuffer) => {
    const { ctx, analyser } = audio();
    if (ctx.state === "suspended") await ctx.resume();
    const decoded = await ctx.decodeAudioData(data.slice(0));
    await new Promise<void>((resolve) => {
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(analyser);
      src.onended = () => resolve();
      current = src;
      src.start();
    });
    current = null;
  };

  return {
    supported: { listen: browser.supported.listen, speak: true },
    listen: (h) => browser.listen(h),
    stopListening: () => browser.stopListening(),
    prefetch(text) {
      sentences(text).forEach(fetchAudio);
    },
    // Loudness of what Alex is saying right now, 0..1, for the light.
    level() {
      if (!analyser || !current) return 0;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const b of buf) sum += ((b - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / buf.length) * 5);
    },
    async speak(text, onPulse) {
      speaking = true;
      const parts = sentences(text);
      const pending = parts.map(fetchAudio); // all at once; played in order
      for (let i = 0; i < parts.length && speaking; i++) {
        const data = await pending[i];
        if (!speaking) break;
        try {
          if (data) {
            onPulse?.();
            await play(data);
          } else {
            await browser.speak(parts[i], onPulse);
          }
        } catch {
          await browser.speak(parts[i], onPulse);
        }
      }
      speaking = false;
    },
    cancelSpeech() {
      speaking = false;
      try { current?.stop(); } catch { /* already stopped */ }
      current = null;
      browser.cancelSpeech();
    },
  };
}
