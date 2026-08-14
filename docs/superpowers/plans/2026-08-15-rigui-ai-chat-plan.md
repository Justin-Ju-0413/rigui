# AI 对话首页实现计划

日期:2026-08-15
Spec:`docs/superpowers/specs/2026-08-15-rigui-ai-chat-design.md`(commit `3f48e18`)
版本目标:1.7.0
执行方式:主代理顺序执行 + TDD(每任务先测试后实现,独立 commit)

## 任务拆分

### Task 1: 数据层 chat_messages

- 新增 `src/db/chat.ts`:`ChatMessage` 类型 + `listMessages(limit)` / `addMessage` / `clearMessages`
- `src/db/schema.ts`:Dexie version +1,新增 `chat_messages` 表(主键 `++id`,索引 `createdAt`)
- 新增 `src/db/chat.test.ts`:CRUD、按时间序、limit 截断、清空
- 验收:`npx vitest run src/db/chat.test.ts` 绿;`npm run lint` 0 error

### Task 2: 对话引擎(协议解析 + 执行器)

- 新增 `src/ai/chatTypes.ts`:`ChatAction` 判别联合(7 种动作)、`ChatReply`
- 新增 `src/ai/chat.ts`:
  - `parseReply(text)`:剥离 markdown 代码块、JSON.parse 容错(失败返回 null)
  - `buildMessages(history, userInput)`:系统提示 + 最近 20 条 + 用户输入
  - `executeQueryActions(actions)`:query_events/query_goals 自动执行,结果回填文本
  - `sendChatMessage(config, history, input)`:调 LLM → parseReply → executeQueryActions → 返回 reply+写类动作
- `src/ai/prompt.ts`:追加 `CHAT_SYSTEM_PROMPT`(当前日期、动作协议说明、回复要求);现有 parseEvent 提示保留
- 新增 `src/ai/chat.test.ts`:代码块剥离、非法 JSON 容错、动作校验、历史组装(20 条截断)、查询回填、LLM 失败传播
- 验收:chat 测试绿;lint 0 error

### Task 3: 对话 UI

- 新增 `src/pages/ChatView.tsx`:容器——历史滚动(useEffect 滚动到底)、加载态、空态、错误重试;路由 `/`
- 新增 `src/components/chat/ChatMessage.tsx`:user 右 accent-soft 底 / assistant 左玻璃卡;三点呼吸加载气泡
- 新增 `src/components/chat/ChatInput.tsx`:textarea(.input)+ 发送(.btn-primary),Enter 发送(IME 防护沿用 isComposing 惯例),loading 禁用
- 新增 `src/components/chat/Suggestions.tsx`:空态 4 快捷问句
- 新增 `src/components/chat/ActionCard.tsx`:写类动作确认卡——create 复用 EventPreviewCard 展示 + validateParsedEvent 校验 + findConflicts 冲突提示;update/delete 显示改动前后;schedule_week 复用排期预览;确认→crud→notifyEventsChanged;取消→丢弃
- 新增 `src/pages/ChatView.test.tsx`(mock LLM):历史渲染、发送→确认卡→入库、取消丢弃、错误重试、空态快捷问句、loading 禁用
- 验收:ChatView 测试绿;lint 0 error

### Task 4: 布局与路由改造

- `src/App.tsx`:`/` → ChatView;新增 `/month` → MonthView;移除 `<AIInputPanel/>`;保留 useLiquidGlow
- `src/components/layout/BottomNav.tsx` / `Sidebar.tsx`:items 加「对话」(`/`,end);「日程」→ `/month`
- 删除 `src/components/AIInputPanel.tsx` 与 `AIInputPanel.test.tsx`;修复依赖 AIInputPanel 的测试(App.test.tsx 等)
- `src/pages/MonthView.tsx`:内部日/周切换链接指向 `/month`(原 `/` 语义迁移)
- 验收:`npm test` 全绿(184 - AIInputPanel 用例 + 新增);lint 0 error

### Task 5: E2E + 全量门禁 + 收尾

- 新增 `e2e/chat.spec.ts`(mock LLM):对话创建日程全流程(确认卡→月视图可见);多轮查询(「明天有什么安排」→ 追问)
- 全量:`npm test` / `npm run lint` / `npm run build` / `npm run test:e2e` / `npm run perf`
- 文档:`CHANGELOG.md` 补 1.7.0(或 Unreleased)条目;`README.md` 功能列表加「AI 对话」
- 验收:五道门禁全绿

## Global constraints

- 现有测试的 data-testid/aria-label 不变;删除组件时同步删除其测试
- DayView 等无关文件零改动
- 对话引擎不依赖 function calling API;llm/client.ts 现有 send 能力复用(补 JSON response_format 时保持兼容,失败降级)
- Electron 无 IPC 变更
- 中文注释与项目惯例一致;commit message 英文
