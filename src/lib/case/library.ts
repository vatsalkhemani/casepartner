import { CasePack } from "./schema";
import { lanternCoffee } from "../../../cases/library/lantern-coffee";

const packs: CasePack[] = [lanternCoffee];

export function getPack(id: string): CasePack {
  const pack = packs.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown case: ${id}`);
  return pack;
}

// Uploaded cases live in the uploader's browser and arrive with each request.
// Images stay in the browser; the server only needs the text of the pack.
export function resolvePack(caseId: string, uploaded?: unknown): CasePack {
  if (!caseId.startsWith("upload-")) return getPack(caseId);
  const pack = CasePack.parse(uploaded);
  if (pack.id !== caseId) throw new Error("uploaded case does not match the session");
  return { ...pack, exhibits: pack.exhibits.map(({ image: _image, ...e }) => e) };
}

// Safe to send to the browser: nothing the candidate has to earn.
export function listCases() {
  return packs.map((p) => ({ id: p.id, title: p.title, client: p.client, meta: p.meta, teaser: p.prompt.objective }));
}
export type CaseSummary = ReturnType<typeof listCases>[number];
