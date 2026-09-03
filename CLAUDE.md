# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Vite dev server
npm run build         # tsc -b && vite build (type-check, then build to dist/)
npm run preview        # preview the production build locally
npm run lint          # oxlint
npm test            # vitest run (single pass, CI-friendly)
npm run test:watch      # vitest (watch mode)
```

Run a single test file: `npx vitest run src/lib/prompt.test.ts`
Run tests matching a name: `npx vitest run -t "some test name substring"`

## Architecture

This is a **100% static, zero-backend** trip itinerary planner deployed to GitHub Pages
(`vite.config.ts` sets `base: '/tripplanner/'` to match the repo name — update this if the
repo is ever renamed or forked). There is no server and no database; all state lives in the
browser (`localStorage` via zustand's `persist` middleware).

### AI is bring-your-own-key, called directly from the browser

The user supplies their own AI provider API key in Settings; it is stored only in
`localStorage` (`useSettingsStore`, key `tripplanner-settings`) and sent directly from the
browser to the provider's API. There is no proxy — never add a backend/serverless function to
relay these calls, that would break the "100% free, static hosting" constraint this project is
built around.

Two request "flavors" are supported (`ApiFlavor` in `src/store/settingsStore.ts`):
- `openai-compatible`: `POST {baseUrl}/chat/completions`, `Authorization: Bearer <key>` — used
  by OpenAI, OpenRouter, DeepSeek, and Gemini's OpenAI-compatibility endpoint.
- `anthropic`: `POST {baseUrl}/messages`, `x-api-key` + `anthropic-version` header, plus the
  `anthropic-dangerous-direct-browser-access: true` header required for direct browser calls.

`PROVIDER_PRESETS` in `settingsStore.ts` maps a provider id to `{ baseUrl, flavor,
defaultModel }`. Adding support for a new OpenAI-compatible or Anthropic-compatible provider is
usually just adding a preset entry — it does not need new request-building code. A genuinely
different wire format would need a third flavor and a new branch in `src/lib/aiClient.ts`.

`aiClient.ts`'s `callAi()` retries transient failures (HTTP 408/429/500/502/503/504/529 — e.g.
Gemini's frequent free-tier 503 "model overloaded") up to 3 attempts with exponential backoff
(2s, 4s), reporting progress through an `onRetry(attempt, maxAttempts, delayMs)` callback that
`App.tsx` surfaces in the UI. Non-transient errors (401, 404, etc.) are not retried.

### Generation data flow

`TripForm` → `TripInput` → `buildPrompt()` (`src/lib/prompt.ts`) builds a system/user prompt
pair that instructs the model to return one JSON object matching a fixed schema (destination,
summary, highlights, route, dailyPlans, budgetBreakdown, equipment, tips) → `callAi()` → raw
text → `parseItineraryResponse()` extracts JSON defensively (handles ```json fences, unlabeled
fences, or JSON embedded in surrounding prose) and validates shape, throwing
`AI_RESPONSE_NOT_JSON` or `AI_RESPONSE_SHAPE_INVALID` on failure → resulting `Itinerary` is
rendered by `ItineraryView` and appended to `useTripStore`'s history (capped at 50 entries,
newest first, persisted under `tripplanner-history`).

### i18n

Three languages (zh/ja/en) via `react-i18next`, resources in `src/i18n/locales/*.json`. The
active language is *not* a separate i18n concern — it's a field on `useSettingsStore`
(`language`), and `App.tsx` syncs it into `i18next` via `useEffect`. When adding user-facing
strings, add the key to all three locale files, not just one.

### Map and PDF export are code-split

`MapView` (Leaflet + OpenStreetMap, no API key needed) is loaded via `React.lazy` inside
`ItineraryView`, and `pdfExport.ts` dynamically `import()`s `html2canvas`/`jspdf` only when the
user actually clicks export. Keep new heavy dependencies (map libraries, PDF/image processing,
etc.) behind a dynamic import the same way rather than adding them to the main bundle.

### Deployment

`.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to
`main` (via `actions/upload-pages-artifact` + `actions/deploy-pages`). GitHub Pages must have
its Source set to "GitHub Actions" in repo settings (already configured for this repo via `gh
api repos/.../pages -f build_type=workflow`).

### Testing conventions

Vitest + jsdom, test files colocated as `*.test.ts` next to the source they cover (see
`src/lib/*.test.ts`, `src/store/*.test.ts`). Zustand stores are singletons — tests reset state
in `beforeEach` via `useXStore.setState(initialState, true)` and clear `localStorage`. Mock
`fetch` with `vi.stubGlobal('fetch', vi.fn())` and use `vi.useFakeTimers()` /
`vi.advanceTimersByTimeAsync()` to test the retry backoff without real delays.
