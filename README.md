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

## 部署到 GitHub Pages

1. 在 GitHub 上新建一个名为 `tripplanner` 的仓库，并把本项目推送上去（`main` 分支）。
2. 在仓库 Settings → Pages 中，Source 选择 **GitHub Actions**。
3. 推送到 `main` 分支后，`.github/workflows/deploy.yml` 会自动构建并部署到
   `https://<你的用户名>.github.io/tripplanner/`。

> 如果仓库名不是 `tripplanner`，需要同步修改 `vite.config.ts` 里的 `base` 字段为 `/<你的仓库名>/`。

## 使用说明

1. 打开网站后先进入「设置」，选择一个 AI 服务商预设（或填自定义 Base URL），粘贴你自己的 API Key 和模型名称。
2. 回到「生成行程」，填写出发地、目的地、预算、天数、交通方式和偏好标签，点击生成。
3. 生成结果包含行程概览、重点景点、路线地图、每日行程、预算明细和装备清单，可导出 PDF。
4. 历史生成过的行程会自动保存在「历史行程」中（仅存于本机浏览器）。

## 技术栈

React + Vite + TypeScript · Zustand (状态与本地持久化) · react-i18next (三语) · Leaflet / react-leaflet (地图) · jsPDF + html2canvas (PDF 导出)
