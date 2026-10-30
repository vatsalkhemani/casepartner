// Minimal Gemini REST client. Server-only: the key never reaches the browser.
//
// Models were chosen by measuring them on this app's real prompts
// (2026-10-29): the newest Flash was over its free quota (429), so each role
// has a ranked list and falls through on quota, retirement or timeout.
// GEMINI_MODEL, if set, goes first for every role.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type Role = "director" | "actor" | "judge" | "compiler";

const MODELS: Record<Role, string[]> = {
  director: ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"], // ~1s, careful judgement
  actor: ["gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"], // fastest, it only phrases beats
  judge: ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"], // one call per case, can take longer
  compiler: ["gemini-2.5-flash", "gemini-3.1-flash-lite"], // reads casebook pages once per case; needs vision and care
};

// Models that answered 429/404/410 are skipped for a while.
const benched = new Map<string, number>();
const BENCH_MS = 10 * 60_000;

export function hasGemini() {
  return !!process.env.GEMINI_API_KEY && process.env.LLM_PROVIDER !== "rules";
}

function candidates(role: Role): string[] {
  const list = [process.env.GEMINI_MODEL, ...MODELS[role]].filter((m): m is string => !!m);
  const now = Date.now();
  const live = [...new Set(list)].filter((m) => (benched.get(m) ?? 0) < now);
  return live.length ? live : MODELS[role];
}

type GenerateOpts = {
  role: Role;
  system?: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  images?: { mimeType: string; data: string }[]; // base64, sent alongside the prompt
};

export async function generate(prompt: string, opts: GenerateOpts): Promise<string> {
  let lastError = "no model tried";
  for (const name of candidates(opts.role)) {
    const budget = opts.role === "compiler" ? 2048 : opts.role === "judge" ? 1024 : 0;
    const thinking = name.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: budget } } : {};
    try {
      const res = await fetch(`${BASE}/models/${name}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
        body: JSON.stringify({
          systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
          contents: [{ role: "user", parts: [...(opts.images ?? []).map((inlineData) => ({ inlineData })), { text: prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            maxOutputTokens: opts.maxTokens ?? 800,
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
            ...thinking,
          },
        }),
      });
      if (res.status === 429 || res.status === 404 || res.status === 410) {
        benched.set(name, Date.now() + BENCH_MS);
        lastError = `${name} ${res.status}`;
        console.warn(`[gemini] ${opts.role}: ${name} answered ${res.status}, trying the next model`);
        continue;
      }
      if (!res.ok) throw new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) throw new Error(`${name} returned no text`);
      return text;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(`[gemini] ${opts.role}: ${name} failed (${lastError}), trying the next model`);
    }
  }
  throw new Error(`Gemini unavailable for ${opts.role}: ${lastError}`);
}
