import { NextResponse } from "next/server";
import { z } from "zod";
import { getPack } from "@/lib/case/library";
import { makeDebrief } from "@/lib/interviewer/debrief";
import { SessionState } from "@/lib/interviewer/session";

const Body = z.object({ state: SessionState });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  return NextResponse.json(await makeDebrief(getPack(body.data.state.caseId), body.data.state));
}
