# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 需求（Requirements）

**产品目标**：100% 零成本的旅行行程规划器，部署在 GitHub Pages。

**核心输入**：出发地、目的地、预算（可选币种）、天数、交通方式、景点偏好。

**核心输出**：包含重点景点、路线地图、每日行程、装备清单的详细行程手册。每次生成都必须包含 4
个核心模块——交通路线（`transportPlan`）、预算明细（`budgetBreakdown`）、必吃美食
（`mustEatFood`）、避坑提示（`pitfallWarnings`），缺一不可，由 prompt 要求 + 响应二次校验双重
保证（见下方 Architecture 的 "Generation data flow"）。

**用户背景与约束**：
- 面向全球任意目的地规划，不是仅限中国大陆场景的工具；用户本人常驻日本，因此不能默认往中国大
  陆专用服务（高德/百度地图、仅限中国的 AI 服务商等）去想，地图/AI 服务商/币种等地域相关默认值
  要能覆盖全球使用场景。
- 完全静态托管、零后端、零数据库，一切状态留在用户浏览器本地。
- AI 能力由用户自带 API Key（BYO Key）实现，Key 只存本地浏览器，不经过任何服务器中转。
- 界面与生成内容需支持中/日/英三语切换。
- 生成结果需可网页内浏览，并支持一键导出 PDF。
- 历史生成过的行程保存在浏览器本地，可查看/删除/清空。

**工程规范**（用户明确要求，详见下方 Mandatory rules 与 Testing conventions）：命名必须用清晰
英文、修改代码必须同步更新对应测试、严禁引入 Tech stack 之外的第三方依赖、测试必须验证真实行
为且遵循先红后绿的工作流。

## Tech stack

React 19 + TypeScript, built and bundled by Vite. State/persistence via Zustand
(`zustand/middleware persist`, backed by `localStorage`). i18n via `react-i18next`. Map via
Leaflet/`react-leaflet` with OpenStreetMap tiles. PDF export via `jspdf` + `html2canvas`.
Linting via `oxlint`. Tests via `vitest` + `jsdom`. CI/CD via GitHub Actions, hosted on GitHub
Pages. No backend, no database, no server-side code anywhere in this repo.

## Mandatory rules

- **Naming**: variable and function names must be clear, meaningful English — no pinyin,
  transliterations, or cryptic abbreviations. (Conventional short names like `i` in a loop or
  `err` in a catch are fine.)
- **Keep tests in sync**: whenever a source file is modified, update its corresponding test
  file (see Testing conventions below) in the same change. A behavior change with no
  corresponding test update is incomplete work, not a follow-up.
- **Do not introduce third-party dependencies outside the stack above** without the user's
  explicit approval first. If a task seems to need a library beyond what's listed in Tech
  stack, ask before adding it rather than pulling one in on your own judgment.

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
summary, highlights, route, dailyPlans, equipment, tips, plus the 4 core sections below) →
`callAi()` → raw text → `parseItineraryResponse()` extracts JSON defensively (handles ```json
fences, unlabeled fences, or JSON embedded in surrounding prose), validates shape, and enforces
the core sections, throwing `AI_RESPONSE_NOT_JSON`, `AI_RESPONSE_SHAPE_INVALID`, or
`AI_RESPONSE_MISSING_CORE_SECTIONS:<key1>,<key2>,...` on failure → resulting `Itinerary` is
rendered by `ItineraryView` and appended to `useTripStore`'s history (capped at 50 entries,
newest first, persisted under `tripplanner-history`).

**Every generated itinerary must include 4 core sections**, each a required non-empty array on
`Itinerary` (`CORE_SECTION_KEYS` in `src/lib/prompt.ts` is the single source of truth for
which): `transportPlan` (交通路线), `budgetBreakdown` (预算明细), `mustEatFood` (必吃美食), and
`pitfallWarnings` (避坑提示). This is enforced twice — the prompt explicitly instructs the model
that a response missing or emptying any of them is invalid, and `parseItineraryResponse`
independently re-validates the actual response and rejects it (surfaced to the user as a
translated error listing exactly which sections were missing) rather than silently defaulting
to `[]` the way the other, non-core optional fields do. `ItineraryView` reads these 4 fields
with a `?? []` fallback since trip records saved to `localStorage` history before this
validation existed won't have them.

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

**These rules are mandatory for every test written in this repo, not just suggestions:**
- Every test must assert a concrete input against a concrete expected output. Never write a
  vacuous assertion like `expect(true).toBe(true)`.
- Never hardcode an expected value just to force a test to pass, and never add test-only
  branches to production code (e.g. `if (testMode) { ... }`) to make a test pass artificially.
- Write the test first and confirm it actually fails (red) before making it pass (green) —
  don't write the implementation first and then a test that trivially confirms it. For a test
  added against existing code, verify it isn't vacuous by temporarily breaking the
  implementation and confirming the test fails, then revert (see this repo's git history for
  examples of this mutation-check workflow).
- Cover boundary values, exception paths, and error conditions — not just the happy path.
- Name each test so its purpose is obvious without reading the test body.
- If the expected behavior for a case is ambiguous, ask the user rather than guessing and
  proceeding on an assumption.

## 设计决策（Design decisions）

关键设计取舍和选择的理由，便于理解"为什么不是另一种做法"，改动这些决策前先确认是否仍然成立：

- **纯静态 + BYO Key，而非自建后端代理**：满足"100% 零成本"的硬约束——一旦引入后端/代理，就需
  要付费的服务器或函数调用额度。代价是 API Key 会经浏览器直接发往第三方服务商，这个风险已经在
  设置页面的文案里向用户明确告知，属于已知且接受的取舍。
- **OpenAI 兼容接口为主 + Anthropic 原生适配器，而非为每个服务商单独写适配器**：绝大多数主流服
  务商（OpenAI、OpenRouter、DeepSeek、Gemini）都提供 OpenAI 兼容层，一套代码可以适配所有，只有
  Anthropic 原生接口格式不同，才需要第二套（见 `ApiFlavor`）。
- **Leaflet + OpenStreetMap，而非高德/百度/Google Maps**：免费、无需 API Key、无使用量限制，且
  能覆盖全球任意目的地——用户常驻日本、规划的是全球行程，不能锁定中国大陆专用地图服务。
- **Zustand + `localStorage` persist，而非自建后端存储历史**：与"零后端"约束一致；代价是历史记
  录只存在单一浏览器/设备上，换设备会丢失，这是已知取舍（见 README）。
- **4 个核心模块用"prompt 要求 + 响应后二次校验"双重机制，而非只在 prompt 里要求**：AI 有可能
  不严格遵循 prompt 指令而漏掉字段，仅靠 prompt 无法保证。所以 `parseItineraryResponse` 会二次
  校验，缺失时直接拒绝该次生成并报错，而不是静默展示不完整的行程。
- **三语通过 `react-i18next` + 用户手动切换，而非自动检测浏览器语言**：`i18next-browser-
  languagedetector` 曾经装过但从未接线使用，后来被移除——语言完全由用户在设置里手动选择并持久
  化，避免自动检测带来的意外切换。
- **Vitest 而非 Jest**：项目已用 Vite 构建，Vitest 与 Vite 配置无缝集成，不需要额外的 transform
  配置。
- **`parseItineraryResponse` 的兼容性回归测试基于已知 LLM JSON 输出问题模式构造，而非真实抓包样
  本**：项目是纯前端 BYO Key 架构，没有服务端日志，无法获取用户实际使用中遇到的真实解析失败样
  本。因此 `prompt.test.ts` 里"已知 LLM JSON 输出问题模式"这组测试（尾随逗号、单层 wrapper 包
  裹如 `{"itinerary": {...}}`、budgetBreakdown 金额被写成数字字符串）是基于文档化的、有据可查的
  常见 LLM 输出问题构造的，测试命名和注释里明确标注这一点，不冒充真实样本。等实际使用中真的遇
  到解析失败，再用那次的真实响应补充回归测试（对应 Issue #3 的验收标准）。
- **预算合理性校验：阈值 20%，且只在实际总额超出预算时提示**：`budgetCheck.ts` 的
  `BUDGET_OVERAGE_THRESHOLD` 定为 0.2，`isBudgetOverThreshold` 只在
  `(总额 - 预算) / 预算 > 20%` 时返回 true——远低于预算的情况不触发提示。这是产品判断而非技术限
  制：超支是用户最关心、最需要被提醒的场景，远低于预算的提示价值较低且容易造成"提示疲劳"，改动
  这个阈值或触发方向前先确认这个取舍是否仍然成立。

## 待办任务清单（TODO）

剩余工作拆分成 3 个独立的 GitHub Issue 跟踪，逐项勾选状态以 Issue 本身为准，不在本文件重复维护：

1. **[#1 部署与协作流程强化](https://github.com/qimeimeiqi-hash/tripplanner/issues/1)**（原 Phase
   3）：CI 测试门槛、PR 校验工作流、fork 说明、发布记录。**建议最先执行**——是保护后两个 Issue
   改动质量的基础设施，改动范围小、风险低。
2. **[#2 前端体验打磨](https://github.com/qimeimeiqi-hash/tripplanner/issues/2)**（原 Phase 2）：
   移动端窄屏适配、加载态细化、错误提示可读性。**建议第二执行**——用户可见、与其余两个 Issue 相
   互独立，收益直接。
3. **[#3 核心逻辑加固](https://github.com/qimeimeiqi-hash/tripplanner/issues/3)**（原 Phase 1）：
   基于真实响应样本的回归测试、预算合理性校验。**建议最后执行**——依赖实际使用中积累的真实失败
   样本，天然节奏最慢，且预算校验阈值需要产品设计判断。

三个 Issue 相互独立，以上顺序是按风险/收益给出的建议，不是强制依赖关系。
