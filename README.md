# 日规 rigui

移动端优先的 AI 日程计划 PWA。说一句「下周二下午3点和老王开会」，自动生成日程——时间、地点、重复、提醒都解析好，确认即入库。

- 自然语言创建日程（OpenAI 兼容 API，数据仅存本地）
- 月/周/日/列表视图，冲突检测
- 目标驱动排期：定义目标（每周次数/时长），一键排满未来一周空闲时段，删除级联清理
- AI 智能周报：月视图本周简报——完成率、目标进度、时间分布、空闲与冲突分析，可一键生成 AI 总结
- Web 通知提醒（前台调度约 30s 触发；Service Worker 处理通知点击）
- ICS 导出（兼容 Apple/Google 日历）、JSON 备份导入导出

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开后：设置页填入 API 地址 / Key / 模型（支持任意 OpenAI 兼容端点：DeepSeek、OpenAI、本地 vLLM 等）。

## 技术栈

Vite / React 19 / TypeScript / Tailwind 4 / Dexie(IndexedDB) / vite-plugin-pwa

## 开发

```bash
npm test          # 单元测试
npm run test:e2e  # E2E（mock LLM）
npm run lint && npm run build
```

## 路线图

- ✅ v1：自然语言创建 + 冲突检测 + 四视图 + 通知 + 导出
- ✅ v2：目标驱动自动排期（目标卡 + 排期一周 + 级联删除）
- ✅ v3：智能分析（AI 周报）
- 后续方向：目标任务拆解、周报自动推送

## License

MIT
