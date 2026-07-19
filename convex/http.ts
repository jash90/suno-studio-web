import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Trasy logowania Convex Auth
auth.addHttpRoutes(http);

// Proxy pobierania: klient (inny origin niż CDN Suno) nie może fetchować plików
// audio/okładek z powodu CORS. httpAction pobiera plik server-side i streamuje go
// z nagłówkiem CORS, więc klient dostaje bloba do downloadu / spakowania w ZIP.
// Wymaga zalogowania (Bearer token) — bez tego byłby publicznym open-proxy (SSRF).
// ponytail: hosty CDN Suno bywają zmienne, więc zamiast allowlisty hostów jest
// auth + blokada adresów prywatnych; jeśli nadużywane — dodać allowlistę.
const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[)/i;

const download = httpAction(async (ctx, request) => {
  if ((await ctx.auth.getUserIdentity()) === null) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response("Bad url", { status: 400 });
  }
  if (PRIVATE_HOST.test(new URL(url).hostname)) {
    return new Response("Bad url", { status: 400 });
  }
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return new Response(`Upstream ${upstream.status}`, { status: 502 });
  }
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") ?? "application/octet-stream"
  );
  const len = upstream.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(upstream.body, { status: 200, headers });
});

http.route({ path: "/download", method: "GET", handler: download });
http.route({
  path: "/download",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }),
});

export default http;
