import { NextResponse } from "next/server";
import { z } from "zod";
import { resolvePack } from "@/lib/case/library";
import { makeDebrief } from "@/lib/interviewer/debrief";
import { SessionState } from "@/lib/interviewer/session";

const Body = z.object({ state: SessionState, pack: z.unknown().optional() });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  let pack;
  try {
    pack = resolvePack(body.data.state.caseId, body.data.pack);
  } catch {
    return NextResponse.json({ error: "unknown or invalid case" }, { status: 400 });
  }
  return NextResponse.json(await makeDebrief(pack, body.data.state));
}
