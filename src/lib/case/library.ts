import type { CasePack } from "./schema";
import { lanternCoffee } from "../../../cases/library/lantern-coffee";

const packs: CasePack[] = [lanternCoffee];

export function getPack(id: string): CasePack {
  const pack = packs.find((p) => p.id === id);
  if (!pack) throw new Error(`Unknown case: ${id}`);
  return pack;
}

// Safe to send to the browser: nothing the candidate has to earn.
export function listCases() {
  return packs.map((p) => ({ id: p.id, title: p.title, client: p.client, meta: p.meta, teaser: p.prompt.objective }));
}
export type CaseSummary = ReturnType<typeof listCases>[number];
