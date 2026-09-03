# TODO

分阶段执行计划，依据 `CLAUDE.md` 中描述的架构（100% 静态托管、BYO AI Key、直连浏览器调用、Leaflet 地图、zh/ja/en 三语、Vitest 测试）拆解。`[x]` 表示已完成，`[ ]` 表示待办。

## Phase 1：核心逻辑

不依赖 UI 展示效果、可用测试验证正确性的部分。

- [x] 行程数据模型（`src/types/itinerary.ts`）：`TripInput` / `Itinerary` / `DailyPlan` / `BudgetItem` / `EquipmentCategory` 等类型
- [x] Prompt 构造与响应解析（`src/lib/prompt.ts`）：`buildPrompt()` 按语言生成 system/user prompt；`parseItineraryResponse()` 容错解析 AI 返回的 JSON（含 markdown 代码块、夹杂文字场景），schema 校验失败时抛出明确错误
- [x] AI 调用客户端（`src/lib/aiClient.ts`）：OpenAI 兼容 + Anthropic 双 flavor 请求构造；HTTP 408/429/500/502/503/504/529 自动重试（指数退避，最多 3 次），非瞬时错误不重试
- [x] 设置状态管理（`src/store/settingsStore.ts`）：provider 预设切换、baseUrl/model/apiKey/language/currency 持久化到 localStorage
- [x] 历史记录状态管理（`src/store/tripStore.ts`）：新增置顶、超过 50 条自动截断、按 id 删除、清空
- [x] 单元测试覆盖以上 lib/ 与 store/ 逻辑，且每条关键断言都做过"改坏实现应变红"的验证（`npm test`）
- [ ] 为 `parseItineraryResponse` 补充更多真实 AI 返回样本的回归测试（不同服务商实际返回格式的差异，比如是否带 `models/` 前缀、字段大小写等），随着实际使用中遇到的解析失败案例持续补充
- [ ] 评估是否需要对 `budgetBreakdown` 金额做合理性校验（例如总和是否接近用户预算，超出阈值时给出提示而非静默展示）

## Phase 2：前端可视化展示

用户可见、需要在浏览器里人工验证效果的部分。

- [x] 行程表单（`src/components/TripForm.tsx`）：出发地/目的地/预算/币种/天数/交通方式/偏好标签
- [x] 行程展示（`src/components/ItineraryView.tsx`）：概览、重点景点、每日行程时间线、预算明细表、装备清单
- [x] 路线地图（`src/components/MapView.tsx`）：Leaflet + OpenStreetMap，懒加载（`React.lazy`）避免拖慢首屏
- [x] PDF 导出（`src/lib/pdfExport.ts`）：html2canvas + jsPDF，动态 `import()` 按需加载
- [x] 设置面板（`src/components/SettingsPanel.tsx`）：provider 预设选择、baseUrl/model/apiKey 编辑
- [x] 历史行程面板（`src/components/HistoryPanel.tsx`）：查看/删除/清空
- [x] 三语界面（zh/ja/en，`src/i18n/`），含错误提示、重试提示文案
- [x] 重试状态可视化：503 等瞬时错误重试时在页面上显示"N 秒后自动重试（第 x/3 次）"
- [ ] 移动端适配复查：当前样式（`App.css`）主要在桌面宽度下调试过，需要在窄屏（<480px）下过一遍表单、地图、每日行程卡片、预算表格是否有溢出/换行问题
- [ ] 加载态细化：目前生成按钮只有文字变成"生成中…"，可以考虑加一个骨架屏或进度指示，因为单次生成可能耗时较长（尤其触发了自动重试时）
- [ ] 错误提示的可操作性：把 `errors.invalidResponse` / 401 / 404 等常见错误映射成更具体的中文/日文/英文提示和"建议操作"（例如 401 提示检查 Key，404 提示检查模型名），而不是只展示服务商原始 JSON 报错

## Phase 3：自动化与发布

CI/CD、部署与项目可维护性相关。

- [x] GitHub Actions 工作流（`.github/workflows/deploy.yml`）：push 到 `main` 自动 build 并部署到 GitHub Pages
- [x] GitHub Pages 已启用（Source = GitHub Actions），线上地址 `https://qimeimeiqi-hash.github.io/tripplanner/`
- [x] `vite.config.ts` 的 `base` 与仓库名对齐
- [x] `CLAUDE.md` 项目说明文档
- [ ] 部署工作流里加入测试/构建校验门槛：在 `deploy.yml` 的 build job 里、`vite build` 之前加一步 `npm test`，测试不过就不构建部署，避免带着回归 bug 上线
- [ ] 补一个 PR/分支上的 CI 工作流（区别于现有的仅在 push `main` 时触发的部署工作流）：在 PR 上跑 `npm run lint` + `npm test` + `npm run build`，给未合并的改动提供反馈
- [ ] README 里的部署说明目前假设仓库名固定为 `tripplanner`；如果之后要支持一键 fork 到别的仓库名，需要补充"fork 后要同步改哪些地方"的说明（`vite.config.ts` 的 `base`、Pages 设置等）
- [ ] 考虑加一个 `CHANGELOG.md` 或利用 GitHub Releases 记录版本变化，目前所有变更历史只存在于 git commit message 里
