import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import { SourceFile } from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ponytail: łączny limit treści źródłowych, żeby nie rozsadzić kontekstu LLM
export const MAX_TOTAL_CHARS = 50_000;

export const SUPPORTED_EXTENSIONS = ["txt", "md", "pdf", "docx"];

function extension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

async function extractPdf(data: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
    );
  }
  return pages.join("\n\n");
}

async function extractDocx(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value;
}

/** Wyciąga tekst z pliku wybranego w przeglądarce (drag&drop lub picker). */
export async function extractText(file: File): Promise<SourceFile> {
  const ext = extension(file.name);
  let text: string;
  switch (ext) {
    case "txt":
    case "md":
      text = await file.text();
      break;
    case "pdf":
      text = await extractPdf(await file.arrayBuffer());
      break;
    case "docx":
      text = await extractDocx(await file.arrayBuffer());
      break;
    default:
      throw new Error(`Nieobsługiwany typ pliku: .${ext}`);
  }
  return { name: file.name, path: file.name, text: text.trim() };
}

// ponytail: fragmenty ~1200 znaków cięte na granicach akapitów, bez overlapu —
// wystarcza do doboru kontekstu dla LLM; overlap dodać, gdyby fragmenty ucinały wątki
const CHUNK_SIZE = 1200;

export function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length + 2 > CHUNK_SIZE) {
      chunks.push(current);
      current = "";
    }
    // pojedynczy akapit dłuższy niż CHUNK_SIZE tnij twardo
    if (p.length > CHUNK_SIZE) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < p.length; i += CHUNK_SIZE) {
        chunks.push(p.slice(i, i + CHUNK_SIZE));
      }
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
