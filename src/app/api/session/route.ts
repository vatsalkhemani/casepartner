import { NextResponse } from "next/server";
import { z } from "zod";
import { getPack } from "@/lib/case/library";
import { startSession } from "@/lib/interviewer/engine";
import { hasGemini } from "@/lib/llm/gemini";

const Body = z.object({ caseId: z.string(), format: z.enum(["candidate_led", "interviewer_led"]) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const pack = getPack(body.data.caseId);
  if (!pack.meta.formats.includes(body.data.format)) return NextResponse.json({ error: "format not supported" }, { status: 400 });
  return NextResponse.json({ ...startSession(pack, body.data.format), mode: hasGemini() ? "model" : "rules" });
}
