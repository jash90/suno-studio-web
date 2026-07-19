import JSZip from "jszip";

// URL „site" Convex (httpActions) — tam żyje proxy /download. Convex ustawia go w
// .env.local jako VITE_CONVEX_SITE_URL; fallback: wyprowadź z API URL (.convex.cloud).
const SITE_URL =
  (import.meta.env.VITE_CONVEX_SITE_URL as string | undefined) ??
  (import.meta.env.VITE_CONVEX_URL as string).replace(".convex.cloud", ".convex.site");

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_");
}

/** Rozszerzenie pliku obrazu z URL-a (fallback jpeg). */
export function imageExt(url: string): string {
  const match = url.split("?")[0].match(/\.(jpe?g|png|webp)$/i);
  return match ? match[1].toLowerCase() : "jpeg";
}

function proxied(url: string): string {
  return `${SITE_URL}/download?url=${encodeURIComponent(url)}`;
}

// Proxy wymaga zalogowania — Studio wstrzykuje tu aktualny token JWT.
let authToken: string | null = null;
export function setDownloadAuthToken(token: string | null): void {
  authToken = token;
}

/** Pobiera plik (z CDN Suno) przez proxy Convex — omija CORS. */
export async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(proxied(url), {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });
  if (res.status === 401) {
    throw new Error("Sesja wygasła — odśwież stronę (F5) i spróbuj ponownie");
  }
  if (!res.ok) throw new Error(`Pobieranie nie powiodło się (HTTP ${res.status})`);
  return res.blob();
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Pobiera pojedynczy plik pod wskazaną nazwą (przeglądarkowy download). */
export async function downloadFile(url: string, filename: string): Promise<void> {
  triggerDownload(await fetchBlob(url), filename);
}

/** Buduje ZIP z listy plików i pobiera go jako jeden plik. Zwraca liczbę zapisanych. */
export async function downloadZip(
  files: { url: string; name: string }[],
  zipName: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ saved: number; errors: string[] }> {
  const zip = new JSZip();
  const errors: string[] = [];
  let saved = 0;
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, files.length);
    try {
      const blob = await fetchBlob(files[i].url);
      zip.file(files[i].name, blob);
      saved++;
    } catch (e) {
      errors.push(`${files[i].name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (saved > 0) {
    const out = await zip.generateAsync({ type: "blob" });
    triggerDownload(out, zipName);
  }
  return { saved, errors };
}
