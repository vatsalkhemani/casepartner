"use client";

import type { CasePack } from "./case/schema";

// Uploaded cases, with their exhibit images, are kept in this browser only
// (IndexedDB: localStorage is too small for page images). Nothing is stored
// on the server.

const DB = "case-partner";
const STORE = "uploads";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const saveUpload = (pack: CasePack) => tx("readwrite", (s) => s.put(pack));
export const getUpload = (id: string) => tx<CasePack | undefined>("readonly", (s) => s.get(id));
export const listUploads = () => tx<CasePack[]>("readonly", (s) => s.getAll());
export const deleteUpload = (id: string) => tx("readwrite", (s) => s.delete(id));

// What the server needs: the pack without its images.
export const forServer = (pack: CasePack): CasePack => ({ ...pack, exhibits: pack.exhibits.map(({ image: _image, ...e }) => e) });
