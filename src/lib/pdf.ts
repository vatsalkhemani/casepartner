"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

// pdf.js runs entirely in the browser: the casebook never leaves this machine
// except for the pages of the one case the user chooses.

let lib: typeof import("pdfjs-dist") | null = null;

async function pdfjs() {
  if (!lib) {
    lib = await import("pdfjs-dist");
    lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return lib;
}

export async function openPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<{ doc: PDFDocumentProxy; pages: string[] }> {
  const { getDocument } = await pdfjs();
  const doc = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    // keep line breaks: case titles are found by looking at the first lines of a page
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]+\n/g, "\n"),
    );
    if (i % 10 === 0 || i === doc.numPages) onProgress?.(i, doc.numPages);
  }
  return { doc, pages };
}

// JPEG at a size the model reads well and a request can carry (~100-250 KB a page).
export async function renderPage(doc: PDFDocumentProxy, n: number, width = 1400, quality = 0.72): Promise<string> {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", quality);
}
