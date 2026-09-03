# 旅行行程规划器 Trip Itinerary Planner

100% 零成本、纯静态的旅行行程规划器，部署在 GitHub Pages 上。输入出发地、目的地、预算、天数、交通方式和景点偏好，AI 自动生成包含重点景点、路线地图、每日行程和装备清单的详细手册。

## 特性

- **纯静态 / 零后端**：完全托管在 GitHub Pages，没有服务器、没有数据库。
- **BYO AI Key**：在「设置」中填入你自己的 AI 服务商 API Key（OpenAI / OpenRouter / Gemini / DeepSeek 等 OpenAI 兼容接口，或 Anthropic 原生接口）。Key 只保存在浏览器 `localStorage`，从浏览器直接发往服务商，不经过任何中转服务器。
- **真实地图**：Leaflet + OpenStreetMap，免费无需申请 Key。
- **三语界面**：中文 / 日本語 / English，一键切换。
- **历史行程**：生成过的行程自动保存在本地浏览器，可随时查看、删除。
- **导出 PDF**：一键把当前行程手册导出为 PDF。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 测试

```bash
npm test        # 单次运行
npm run test:watch  # 监听模式
```

测试覆盖 `src/lib`（prompt 构建/解析、AI 调用与重试退避逻辑）和 `src/store`（settings/history 状态管理），使用 Vitest。

## 部署到 GitHub Pages

1. 在 GitHub 上新建一个名为 `tripplanner` 的仓库，并把本项目推送上去（`main` 分支）。
2. 在仓库 Settings → Pages 中，Source 选择 **GitHub Actions**（也可以用 `gh api repos/<你的用户
   名>/<仓库名>/pages -f build_type=workflow` 一步到位）。
3. 推送到 `main` 分支后，`.github/workflows/deploy.yml` 会先跑 `npm test`，测试通过才会构建并
   部署到 `https://<你的用户名>.github.io/tripplanner/`；同时 `.github/workflows/ci.yml` 会在每
   个指向 `main` 的 PR 上自动跑 `lint` + `test` + `build`。

### Fork 到别的仓库名

如果你 fork 这个项目并改用了别的仓库名（不是 `tripplanner`），部署前需要同步修改：

- **`vite.config.ts`**：把 `base: '/tripplanner/'` 改成 `base: '/<你的新仓库名>/'`，否则 GitHub
  Pages 上的静态资源路径会全部 404。
- **GitHub Pages 设置**：按上面第 2 步，在你 fork 出来的新仓库里单独把 Source 设为
  **GitHub Actions**（这个设置不会随 fork 自动带过去）。
- **本文档里出现的示例网址**（`https://qimeimeiqi-hash.github.io/tripplanner/`）：仅供参考，换
  成你自己 fork 后实际部署出来的地址即可，不影响功能。
- **`CLAUDE.md` 里链接到的 3 个 Issue**：那些是原仓库（`qimeimeiqi-hash/tripplanner`）的开发记
  录，fork 后仍然可以作为背景参考阅读，但如果你想继续用 Issue 追踪自己 fork 上的后续工作，需要
  在你自己的仓库里另外开 Issue，链接不会自动同步。

不需要改的：AI Key、Base URL、模型名等都是运行时由使用者在网页「设置」里自己填写、存在浏览器
本地，跟仓库/部署配置无关。

## 使用说明

1. 打开网站后先进入「设置」，选择一个 AI 服务商预设（或填自定义 Base URL），粘贴你自己的 API Key 和模型名称。
2. 回到「生成行程」，填写出发地、目的地、预算、天数、交通方式和偏好标签，点击生成。
3. 生成结果包含行程概览、重点景点、路线地图、每日行程、预算明细和装备清单，可导出 PDF。
4. 历史生成过的行程会自动保存在「历史行程」中（仅存于本机浏览器）。

## 变更记录

这个项目不维护单独的 `CHANGELOG.md`：commit message 已经写清楚了每次改动的动机（"为什么"），
`git log` 本身就是可查询的变更记录，再手动同步一份 changelog 文件容易和实际提交脱节、增加维护
负担。如果未来需要对外发布"版本"概念（例如给非开发者用户看的版本说明），再考虑用 GitHub
Releases 对着某个 commit 打 tag，而不是引入新文件。

## 技术栈

React + Vite + TypeScript · Zustand (状态与本地持久化) · react-i18next (三语) · Leaflet / react-leaflet (地图) · jsPDF + html2canvas (PDF 导出)
