import { notFound } from "next/navigation";
import { listCases } from "@/lib/case/library";
import { Room } from "@/components/Room";

export default async function RoomPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const format = q.format === "interviewer_led" ? "interviewer_led" : "candidate_led";
  const mode = q.mode === "text" ? "text" : "voice";
  // An uploaded case lives in the browser; the room loads it there.
  if (q.upload?.startsWith("upload-")) return <Room caseId={q.upload} format={format} mode={mode} title="" uploaded />;
  const c = listCases().find((x) => x.id === q.case);
  if (!c) notFound();
  return <Room caseId={c.id} format={format} mode={mode} title={c.title} />;
}
