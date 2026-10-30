import { z } from "zod";

// Alex's voice. Gemini TTS, measured 2026-10-30: gemini-3.8-flash-tts answers a
// sentence in ~2.6s, steadily; 2.5-flash-preview-tts swings from 1.8s to 9s.
// The browser falls back to its own voice if this fails.

const MODELS = ["gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview"];
const VOICES = ["Charon", "Kore", "Orus", "Aoede"] as const;

const Body = z.object({ text: z.string().trim().min(1).max(600), voice: z.enum(VOICES).default("Charon") });

const benched = new Map<string, number>();

// Some models return raw 16-bit PCM; browsers need a WAV header to play it.
function wav(pcm: Buffer, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) return new Response("no voice", { status: 503 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return new Response("bad request", { status: 400 });

  for (const model of MODELS) {
    if ((benched.get(model) ?? 0) > Date.now()) continue;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(9000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: body.data.text }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: body.data.voice } } } },
        }),
      });
      if (r.status === 429 || r.status === 404 || r.status === 410) {
        benched.set(model, Date.now() + 10 * 60_000);
        continue;
      }
      if (!r.ok) continue;
      const j = (await r.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] };
      const audio = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!audio) continue;
      const bytes = Buffer.from(audio.data, "base64");
      const out = audio.mimeType.includes("wav") ? bytes : wav(bytes, Number(audio.mimeType.match(/rate=(\d+)/)?.[1] ?? 24000));
      return new Response(new Uint8Array(out), { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
    } catch {
      /* next model */
    }
  }
  return new Response("voice unavailable", { status: 503 });
}
