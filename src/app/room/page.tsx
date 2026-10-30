import { notFound } from "next/navigation";
import { listCases } from "@/lib/case/library";
import { Room } from "@/components/Room";

export default async function RoomPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const c = listCases().find((x) => x.id === q.case);
  if (!c) notFound();
  const format = q.format === "interviewer_led" ? "interviewer_led" : "candidate_led";
  const mode = q.mode === "text" ? "text" : "voice";
  return <Room caseId={c.id} format={format} mode={mode} title={c.title} />;
}
