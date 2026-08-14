# 日规 rigui

移动端优先的 AI 日程计划 PWA。说一句「下周二下午3点和老王开会」，自动生成日程——时间、地点、重复、提醒都解析好，确认即入库。

- 自然语言创建日程（OpenAI 兼容 API，数据仅存本地）
- 月/周/日/列表视图，冲突检测
- 目标驱动排期：目标拆解为任务（各自每周次数/时长），一键排满未来一周空闲时段，删除级联清理
- AI 智能周报：月视图本周简报——完成率、目标/任务进度、时间分布、空闲与冲突分析，可一键生成 AI 总结
- Web 通知提醒（前台调度约 30s 触发；Service Worker 处理通知点击）；周报自动推送（每周日可自定义时间/开关）
- ICS 导出（兼容 Apple/Google 日历）、JSON 备份导入导出
- 桌面应用（Electron）：独立窗口、系统通知、保存对话框，`npm run build:app` 打包 .app/.dmg
- 液态玻璃 UI：暖色极光墙纸 + 玻璃面板 + 弹性动效（分层性能预算，内容卡片零 blur 开销）

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开后：设置页填入 API 地址 / Key / 模型（支持任意 OpenAI 兼容端点：DeepSeek、OpenAI、本地 vLLM 等）。

## 桌面应用（Electron）

同一套代码可打包为 macOS / Windows / Linux 桌面应用，数据仍存本地 IndexedDB（位于系统应用数据目录）。

```bash
npm run dev:app   # 开发：vite 热更新 + Electron 窗口
npm run build:app # 打包当前平台安装包（macOS 产出 release/日规.dmg）
```

- 通知走系统通知（窗口最小化也能收到，点击聚焦窗口）；退出应用后无后台提醒
- ICS / JSON 导出弹系统保存对话框
- 跨平台打包：`npx electron-builder --win` / `--linux`
- 分发提示：本地打包未签名，首次启动需右键「打开」；对外分发需 Apple Developer 证书签名/公证

## 技术栈

Vite / React 19 / TypeScript / Tailwind 4 / Dexie(IndexedDB) / vite-plugin-pwa / Electron

## 开发

```bash
npm test          # 单元测试
npm run test:e2e  # E2E（mock LLM）
npm run perf      # 性能基准（blur 层预算 / FPS / longtask）
npm run lint && npm run build
```

## 路线图

- ✅ v1：自然语言创建 + 冲突检测 + 四视图 + 通知 + 导出
- ✅ v2：目标驱动自动排期（目标卡 + 排期一周 + 级联删除）
- ✅ v3：智能分析（AI 周报）
- 后续方向：目标任务拆解、周报自动推送

## License

MIT