import { NextResponse } from "next/server";
import { z } from "zod";
import { resolvePack } from "@/lib/case/library";
import { runTurn } from "@/lib/interviewer/engine";
import { defaultEngine } from "@/lib/interviewer/llm";
import { SessionState } from "@/lib/interviewer/session";

const Body = z.object({ state: SessionState, text: z.string().trim().min(1).max(3000), pack: z.unknown().optional() });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (body.data.state.phase === "ended") return NextResponse.json({ error: "case is over" }, { status: 409 });
  let pack;
  try {
    pack = resolvePack(body.data.state.caseId, body.data.pack);
  } catch {
    return NextResponse.json({ error: "unknown or invalid case" }, { status: 400 });
  }
  return NextResponse.json(await runTurn(pack, body.data.state, body.data.text, defaultEngine()));
}
