# Changelog

## [Unreleased]

### Added
- AI 对话首页（路径 `/`）：多轮对话创建/查询/修改/删除日程、目标排期、周报小结；写类动作经预览确认卡执行，查询自动回填上下文；对话记录持久化（IndexedDB `chat_messages`），可清空
- 底部导航与桌面侧栏新增「对话」入口，月视图迁移至 `/month`
- **月视图「今天」按钮**：非当月时显示，一键回到当前月
- **全局 ErrorBoundary**：渲染异常不再白屏，展示「重新加载」恢复入口
- **统一组件**：`EmptyState`（列表/目标侧空态）、`Spinner`（路由加载与对话思考中提示）

### Changed
- 液态玻璃升级为 Apple Liquid Glass 风格：顶部弧形高光带 + 亮→暗渐变边缘光 + 玻璃厚度内阴影；悬浮层（底部导航/侧栏/输入条）新增指针/触摸跟随的动态光泽（`prefers-reduced-motion` 自动停用）
- 内容卡片全量启用真玻璃（backdrop-filter），月视图格子用轻 blur 变体（8px）控制 35+ 格的 GPU 开销；无 backdrop-filter 环境自动降级为实色填充
- 底部 AI 输入条移除（功能并入对话页）
- **路由级代码分包**：7 个页面独立 chunk（React.lazy + Suspense），首屏 bundle 397K → 225K，主包之外的路由按需加载
- **PWA 真正离线可用**：Service Worker 由「仅通知点击」升级为 workbox 预缓存 + SPA 导航回退（刷新/深链断网可开）；开发期不注册 SW
- **渲染优化**：月/周视图事件按日分组 `useMemo`（从 O(n) 每格 filter 到一次 O(n)），列表分组+排序 `useMemo`
- **测试基建**：单测超时容错提升（5s→15s，规避偶发抢占 flake）；e2e/perf 一律 `serviceWorkers: 'block'`（活跃 SW 会干扰 e2e 导航稳定）
- **无障碍**：侧栏/底部导航激活项 `aria-current="page"`；加载提示 `role=status`

## [1.6.0] - 2026-08-14

### Added
- 周报自动推送：每周日 20:00（设置页可改时间/关闭）自动推送本周简报——完成率、时长、目标进度、下周计划数
- 与事件提醒共用前台调度与通知通道（Electron 系统通知 / 浏览器 Web Notification），一周去重一次

### Changed
- 设置页新增「周报推送」区块：开关 + 推送时间

## [1.5.0] - 2026-08-14
