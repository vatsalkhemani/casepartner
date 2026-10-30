import { NextResponse } from "next/server";
import { z } from "zod";
import { getPack } from "@/lib/case/library";
import { runTurn } from "@/lib/interviewer/engine";
import { defaultEngine } from "@/lib/interviewer/llm";
import { SessionState } from "@/lib/interviewer/session";

const Body = z.object({ state: SessionState, text: z.string().trim().min(1).max(3000) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (body.data.state.phase === "ended") return NextResponse.json({ error: "case is over" }, { status: 409 });
  const pack = getPack(body.data.state.caseId);
  return NextResponse.json(await runTurn(pack, body.data.state, body.data.text, defaultEngine()));
}
