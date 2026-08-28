# AI 对话首页设计文档

日期:2026-08-15
状态:已获用户批准(2026-08-15)
版本目标:1.7.0

## 背景

rigui 目前以「视图 + 底部 AI 输入条」为交互核心:输入一条自然语言解析成单个日程,预览确认后入库。用户希望产品形态改为 **AI 对话优先**——主页面是一个类似 Codex/Claude 的对话界面,用户与 AI 多轮对话来操作日程(建/查/改/删/排期/周报),并统一全 app 的 UI 与美术风格(保持现有暖色极光液态玻璃)。

## 需求(已与用户确认)

1. **对话成为首页标签**:底部导航与桌面侧栏第一项为「对话」(路径 `/`),月/周/日/列表/目标/设置全部保留原路径与功能
2. **日程全能助手**:对话能建日程、查日程、改/删日程、目标排期、周报,支持多轮对话上下文(如「再加一个明天早上的」)
3. **保持暖色液态玻璃风格**,统一应用到对话界面(气泡/输入区/空态)
4. 对话记录持久化(IndexedDB),刷新不丢

## 信息架构

```
底部导航:💬 对话(/) | 日程(/month) | 目标(/goals) | 列表(/list) | 设置(/settings)
桌面侧栏:对话 置顶,其余不变
```

- 月/日/周视图保持原路径(`/day` `/week` 等)
- **变更**:`/` 从 MonthView 改为 ChatView;MonthView 迁移到新路径 `/month`(月视图内部的日/周切换链接同步指向 `/month`);「日程」Tab 指向 `/month`
- 原 `AIInputPanel`(底部输入条)从全局布局移除,对话输入区并入 ChatView;MonthView 等视图不再有底部输入条(建日程入口收敛到对话页)

## 对话引擎协议(核心)

**不依赖 function calling API**,采用「文本回复 + JSON 动作数组」协议,兼容任意 OpenAI 兼容端点(DeepSeek/OpenAI/本地 vLLM)。

### 请求组装

```
messages = [
  { role: 'system', content: SYSTEM_PROMPT },   // 当前日期、可用动作说明、回复要求
  ...history(最近 20 条 user/assistant),
  { role: 'user', content: 用户输入 },
]
```

查询动作结果以 `assistant` 消息形式回填进历史,参与后续轮次推理。

### 响应协议

LLM 输出 JSON(外层允许包裹 markdown 代码块,解析时剥离):

```json
{
  "reply": "已为你安排明天下午3点与老王开会",
  "actions": [
    { "type": "create_event", "payload": { "title": "与老王开会", "startTime": "2026-08-16T15:00:00", "endTime": "2026-08-16T16:00:00", "allDay": false, "location": "", "reminderOffsets": [], "repeat": "none" } },
    { "type": "query_events", "payload": { "range": "week" } }
  ]
}
```

### 动作类型与执行策略

| type | payload | 执行策略 |
|---|---|---|
| `query_events` | `{ range: 'today'\|'week'\|'month'\|'all' }` | 自动执行,结果注入下一轮 |
| `query_goals` | `{}` | 自动执行,结果注入下一轮 |
| `create_event` | 同 CalendarEvent 必填字段 | **预览确认卡**,确认后入库 |
| `update_event` | `{ id, patch }` | **预览确认卡**(显示改动前后),确认后更新 |
| `delete_event` | `{ id }` | **预览确认卡**,确认后删除 |
| `schedule_week` | `{}`(或 `{ goalId }`) | 复用现有排期逻辑,生成预览(可排时段列表),确认后执行 |
| `weekly_report` | `{}` | 复用现有周报统计,渲染 WeeklyReportCard |

### 动作执行(前端执行器)

- 查询类:执行后把结果序列化追加为下一条 `assistant` 消息(role 标记 `tool` 语义:存为 role='assistant' + 前缀「[查询结果]」,避免 schema 复杂化)
- 写类:解析出的动作进入待确认队列,UI 渲染确认卡;用户确认 → 执行 crud → 刷新相关视图订阅(eventBus);取消 → 丢弃并提示 LLM(下一轮带上「用户取消了操作」)
- 同一回复含多个写类动作:逐卡确认(可一次全部确认/全部取消)

### 容错

- 非 JSON / JSON 无 actions → 当纯文本回复展示
- 动作缺必填字段 → 卡上标注「解析不完整」,禁止确认,提示用户换个说法
- LLM 请求失败(网络/端点错误)→ 气泡内显示重试按钮,输入框内容保留
- LLM 未配置 → 空态引导去设置页(复用现有提示模式)

## 数据模型

### ChatMessage(新增,IndexedDB 表 `chat_messages`)

```ts
export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string          // 文本(assistant 的 reply 或 user 原文)
  actionsJson?: string     // assistant 的原始 actions JSON(渲染确认卡用),user 消息为空
  createdAt: string        // ISO
}
```

- Dexie 表 `chat_messages` 新增,主键 `++id`,索引 `createdAt`(按时间序读取)
- 历史截断:读取时取最近 200 条;发送时取最近 20 条进上下文
- 无需 schema 迁移(新表直接 `db.version(x).stores()` 追加)

## UI 组件

```
src/pages/ChatView.tsx              容器:路由 /,历史滚动 + 输入区 + 空态
src/components/chat/ChatMessage.tsx 气泡:user 右侧 accent 底 / assistant 左侧玻璃卡
src/components/chat/ActionCard.tsx  写类动作确认卡(建/改/删/排期),复用 EventPreviewCard 的展示
src/components/chat/ChatInput.tsx   输入区:textarea + 发送按钮,复用 .input/.btn/.frosted
src/components/chat/Suggestions.tsx 空态快捷问句(4 条,点击即发送)
src/ai/chat.ts                      引擎:组装历史/请求 LLM/解析响应/执行查询类动作
src/ai/chatTypes.ts                 协议类型(ChatReply/ChatAction 等)
src/ai/prompt.ts(扩展)              追加对话系统提示(现有 parseEvent 提示保留)
src/db/chat.ts                      chat_messages CRUD(listMessages/addMessage/clearMessages)
```

### 气泡样式(统一暖色液态玻璃)

- 用户气泡:右侧,`--accent-soft` 底 + 现有玻璃边框圆角 16px
- 助手气泡:左侧,`.card` 玻璃卡(高光带/边缘光随全局升级自动生效)
- 加载中:三点呼吸动画气泡
- 时间戳:气泡下方 `text-tertiary` 小字(仅每组首条显示)

### 空态

- 图标 + 「和日规对话,安排你的日程」
- 4 条快捷问句:「帮我看看明天的安排」「下周三下午3点开会」「给目标排期一周」「本周小结」

## 全局布局变更

- `App.tsx`:`/` → ChatView;新增 `/month` → MonthView;移除全局 `<AIInputPanel/>`;挂载 useLiquidGlow(已有)
- `BottomNav.tsx` / `Sidebar.tsx`:items 加「对话」;「日程」to 改为 `/month`
- `AIInputPanel.tsx` 及其测试:删除(功能被 ChatView 取代);`parseEvent.ts`(validateParsedEvent)与 `planner/conflicts.ts`(findConflicts)保留——ActionCard 校验与确认前冲突提示复用
- 视图页测试中「底部输入条」相关断言随组件删除而移除

## 错误处理与边界

- 并发:发送中禁用输入(loading),防重复提交
- 长回复:气泡内 markdown 轻渲染(仅标题/列表/粗体,不引入重依赖;或直接纯文本换行保留)——**本期纯文本 + 换行**,不做 markdown 渲染
- 清空对话:设置页或对话页头部提供「清空对话」按钮(二次确认)
- Electron 端:对话逻辑纯前端,无 IPC 变更

## 测试策略

- 引擎单测(`src/ai/chat.test.ts`):响应解析(含代码块包裹)、动作校验、历史组装、查询结果回填、非 JSON 容错、LLM 失败传播
- 组件测试(`ChatView.test.tsx`):历史渲染、发送流程(mock LLM)、确认卡入库、取消丢弃、错误重试、空态快捷问句
- E2E(`e2e/chat.spec.ts`,mock LLM):对话创建日程全流程(确认卡→月视图可见)、多轮查询
- 全量回归:现有 184 单测 + 14 e2e + perf 门禁

## 范围排除(本期不做)

- 通用闲聊助手(非日程问题简短拒绝或引导)
- 语音输入、文件/图片引用
- markdown 富渲染
- 对话内改设置(设置页保留)
- 多会话/会话列表(单一持续对话,可清空)
