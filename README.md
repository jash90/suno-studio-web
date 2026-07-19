# Suno Studio (web + Convex)

Webowa wersja Suno Studio — ten sam interfejs i funkcje co aplikacja desktopowa
(`../suno-studio`), ale backend Tauri zastąpiony przez **Convex** (baza reaktywna,
actions server-side, scheduler, auth). Wywołania OpenAI/Anthropic/sunoapi.org idą
przez Convex actions, więc klucze API nie trafiają do JS przeglądarki i nie ma CORS.

## Setup

```bash
npm install

# 1. Zaloguj się do Convex i utwórz deployment (generuje .env.local z VITE_CONVEX_URL
#    oraz convex/_generated/*). Zostaw działające w osobnym terminalu:
npx convex dev

# 2. Skonfiguruj Convex Auth (klucze JWT, SITE_URL) — jednorazowo:
npx @convex-dev/auth

# 3. Frontend (osobny terminal):
npm run dev
```

Otwórz `http://localhost:5173`, załóż konto (e-mail + hasło), wpisz klucze API
w Ustawieniach.

## Architektura

- `convex/schema.ts` — tabele per user (`settings`, `tracks`, `library`, `personas`,
  `albums`) + tabele Convex Auth. Każdy wiersz trzyma cały obiekt domenowy w `data`.
- `convex/generate.ts` — akcja: retrieval (BM25) + LLM → tekst piosenki.
- `convex/suno.ts` — akcje Suno: start generacji, **durable polling** (scheduler),
  konwersja WAV, persony, kredyty.
- `convex/album.ts` — plan koncept-albumu i sekwencyjne pisanie tekstów (server-side,
  przeżywa reload strony).
- `convex/balances.ts` — koszty Anthropic/OpenAI + kredyty Suno.
- `convex/http.ts` — trasy Convex Auth + proxy `/download` (pobieranie plików z CDN
  Suno bez CORS; klient buduje z nich ZIP przez JSZip).
- `convex/lib/{llm,rag}.ts` — czysta logika promptów/BM25 (port z desktopu).
- `src/` — React + Vite; dane z `useQuery`/`useMutation`/`useAction`.

## Pobieranie

Pojedyncze pliki (MP3/WAV/okładka) — zwykły download. Cały album / okładki — jeden
plik `.zip` budowany po stronie klienta (działa we wszystkich przeglądarkach).

## Uwaga

Oryginalna aplikacja desktopowa (`../suno-studio`, Tauri) pozostaje nietknięta —
to niezależny projekt obok.
