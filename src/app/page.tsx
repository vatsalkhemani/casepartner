import { listCases } from "@/lib/case/library";
import { Landing } from "@/components/Landing";

export default function Home() {
  return <Landing cases={listCases()} />;
}
