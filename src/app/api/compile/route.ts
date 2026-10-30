import { NextResponse } from "next/server";
import { z } from "zod";
import { compilePrompt, normalise, parsePack, review } from "@/lib/case/compile";
import { generate, hasGemini } from "@/lib/llm/gemini";

export const maxDuration = 120;

const Body = z.object({
  book: z.string().max(200),
  caseTitle: z.string().min(1).max(200),
  pages: z
    .array(z.object({ n: z.number().int(), text: z.string().max(20_000), image: z.string().max(1_500_000).optional() }))
    .min(1)
    .max(25),
});

// The casebook pages are used for this one request and never stored.
export async function POST(req: Request) {
  if (!hasGemini()) return NextResponse.json({ error: "Setting up an uploaded case needs a Gemini key on the server." }, { status: 503 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { book, caseTitle, pages } = body.data;

  const images = pages
    .map((p) => p.image?.match(/^data:(image\/[a-z]+);base64,(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ mimeType: m[1], data: m[2] }));

  let prompt = compilePrompt(book, caseTitle, pages);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generate(prompt, { role: "compiler", json: true, temperature: 0.1, maxTokens: 16_000, timeoutMs: 110_000, images });
      const { pack, error } = parsePack(normalise(JSON.parse(raw), book, caseTitle));
      if (pack) return NextResponse.json({ pack, warnings: review(pack) });
      console.warn(`[compile] attempt ${attempt + 1} did not fit: ${error}`);
      prompt += `\n\nYour previous reply did not fit the shape: ${error}. Reply again with corrected JSON only.`;
    } catch (e) {
      console.warn(`[compile] attempt ${attempt + 1} failed: ${e instanceof Error ? e.message.slice(0, 300) : e}`);
      if (attempt === 1) return NextResponse.json({ error: e instanceof Error ? e.message : "The case could not be read." }, { status: 502 });
    }
  }
  return NextResponse.json({ error: "The case could not be read into a playable shape. Try a tighter page range." }, { status: 422 });
}
