// Minimal Gemini REST client. Server-only: the key never reaches the browser.
//
// Model names get retired. If GEMINI_MODEL is unset or stops answering, the
// client lists the models the key can use and picks the newest Flash model.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

let resolved: string | null = null;

export function hasGemini() {
  return !!process.env.GEMINI_API_KEY && process.env.LLM_PROVIDER !== "rules";
}

function headers() {
  return { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" };
}

async function pickModel(): Promise<string> {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: headers() });
  if (!res.ok) throw new Error(`Gemini list models failed: ${res.status}`);
  const { models = [] } = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const candidates = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/.test(n) && !/(image|tts|audio|live|embedding|thinking|exp|preview)/.test(n));
  const version = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  candidates.sort((a, b) => version(b) - version(a) || Number(/lite/.test(a)) - Number(/lite/.test(b)));
  if (!candidates.length) throw new Error("No Gemini Flash model available for this key");
  return candidates[0];
}

async function model(): Promise<string> {
  if (resolved) return resolved;
  resolved = process.env.GEMINI_MODEL || (await pickModel());
  return resolved;
}

type GenerateOpts = { system?: string; json?: boolean; temperature?: number; maxTokens?: number; timeoutMs?: number };

export async function generate(prompt: string, opts: GenerateOpts = {}): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const name = await model();
    const res = await fetch(`${BASE}/models/${name}:generateContent`, {
      method: "POST",
      headers: headers(),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      body: JSON.stringify({
        systemInstruction: opts.system ? { parts: [{ text: opts.system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxTokens ?? 800,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
    if (res.status === 404 || res.status === 410) {
      // retired or wrong name: re-pick once
      resolved = await pickModel();
      continue;
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("Gemini returned no text");
    return text;
  }
  throw new Error("Gemini model unavailable");
}

export async function currentModel() {
  return hasGemini() ? model() : null;
}
