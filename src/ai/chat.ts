import dayjs from 'dayjs'
import { chatCompletion } from '../llm/client'
import type { LLMConfig, LLMErrorKind } from '../llm/types'
import { getAllEvents, getAllGoals, getEventsByRange } from '../db/crud'
import type { CalendarEvent, Goal } from '../db/types'
import type { ChatMessage } from '../db/chat'
import type { ChatAction, ChatReply, QueryRange } from './chatTypes'

export type { ChatAction, ChatReply } from './chatTypes'

export type ChatResult =
  | { ok: true; reply: string; actions: ChatAction[]; toolMessages: string[] }
  | { ok: false; errorKind: LLMErrorKind; errorMessage: string }

/** 剥离 ```json 代码块并解析；非法 JSON 返回 null */
export function parseReply(text: string): ChatReply | null {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  try {
    const obj = JSON.parse(candidate) as Partial<ChatReply>
    if (typeof obj !== 'object' || obj === null || typeof obj.reply !== 'string') return null
    const reply: ChatReply = { reply: obj.reply }
    if (Array.isArray(obj.actions)) reply.actions = obj.actions as ChatAction[]
    return reply
  } catch {
    return null
  }
}

export function buildSystemPrompt(now: string): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return [
    '你是「日规」日程助手中的 AI，通过多轮对话帮用户管理日程与目标。',
    `当前时间：${now}，时区：${tz}。相对时间（今天/明天/下周三）基于当前时间计算。`,
    '只输出一个 JSON 对象（可包裹在 ```json 代码块中），字段：',
    '- reply：必填，给用户的中文回复（简洁口语，2 句以内）；',
    '- actions：可选数组，每项 { "type", "payload" }。',
    '动作类型：',
    '- query_events：查询日程，payload.range 取 "today"|"week"|"month"|"all"；',
    '- query_goals：查询目标列表；',
    '- create_event：创建日程，payload 字段 title(必填)、startTime(必填，ISO 本地时间如 2026-08-16T15:00:00)、endTime、allDay、location、reminderOffsets、repeat("none"|"daily"|"weekly"|"monthly")；未指定时间默认 09:00 起 1 小时；',
    '- update_event：修改日程，payload { id, patch }；',
    '- delete_event：删除日程，payload { id }；',
    '- schedule_week：目标排期一周，payload 可选 { goalId }；',
    '- weekly_report：本周小结。',
    '规则：',
    '- 需要日程/目标数据才能回答时，先只输出 query 类动作，reply 可写「让我查一下」——查询结果会在下一轮提供给你；',
    '- 创建/删除/修改类动作（写类）会生成预览让用户确认，确认后才会执行；',
    '- 每个写类动作必须给出完整明确的日程信息；重复动作（如每周）用 repeat 字段表达；',
    '- 用户闲聊或与日程无关时直接简洁回答，不输出 actions。',
  ].join('\n')
}

export function buildMessages(
  history: Array<Pick<ChatMessage, 'role' | 'content'>>,
  input: string,
  now: string,
): { role: string; content: string }[] {
  const recent = history.slice(-20).map(m => ({ role: m.role, content: m.content }))
  return [
    { role: 'system', content: buildSystemPrompt(now) },
    ...recent,
    { role: 'user', content: input },
  ]
}

function rangeBounds(range: QueryRange, now: string): [string, string] | null {
  const base = dayjs(now)
  const fmt = 'YYYY-MM-DDTHH:mm:ss'
  if (range === 'today') return [base.startOf('day').format(fmt), base.endOf('day').format(fmt)]
  if (range === 'week') return [base.startOf('week').format(fmt), base.endOf('week').format(fmt)]
  if (range === 'month') return [base.startOf('month').format(fmt), base.endOf('month').format(fmt)]
  return null
}

function formatEvent(e: CalendarEvent): string {
  const time = `${dayjs(e.startTime).format('MM-DD HH:mm')}${e.endTime ? `-${dayjs(e.endTime).format('HH:mm')}` : ''}`
  const repeat = e.repeat && e.repeat !== 'none' ? ` [${e.repeat}]` : ''
  return `- ${time} ${e.title}${e.location ? `（${e.location}）` : ''}${repeat}`
}

function formatGoal(g: Goal): string {
  const tasks = g.tasks?.length ? `，任务：${g.tasks.map(t => t.name).join('、')}` : ''
  return `- ${g.name}（每周${g.weeklyFrequency ?? 0}次×${g.durationMinutes ?? 0}分钟${tasks}）`
}

/** 执行查询类动作，返回回填文本（注入下一轮上下文）；写类动作不处理 */
export async function executeQueryActions(actions: ChatAction[], now: string): Promise<string[]> {
  const texts: string[] = []
  for (const a of actions) {
    if (a.type === 'query_events') {
      const bounds = rangeBounds(a.payload.range, now)
      const events = bounds ? await getEventsByRange(bounds[0], bounds[1]) : await getAllEvents()
      texts.push(events.length
        ? `【日程 ${a.payload.range}】\n${events.map(formatEvent).join('\n')}`
        : `【日程 ${a.payload.range}】没有日程`)
    } else if (a.type === 'query_goals') {
      const goals = await getAllGoals()
      texts.push(goals.length
        ? `【目标】\n${goals.map(formatGoal).join('\n')}`
        : '【目标】没有目标')
    }
  }
  return texts
}

const QUERY_TYPES = new Set(['query_events', 'query_goals'])

/**
 * 发送一轮对话：组装历史 → 调 LLM → 解析回复 → 执行查询类动作并回填。
 * 返回写类动作（交 UI 生成确认卡）与 toolMessages（调用方追加进历史）。
 */
export async function sendChatMessage(
  config: LLMConfig,
  history: Array<Pick<ChatMessage, 'role' | 'content'>>,
  input: string,
  now = dayjs().format('YYYY-MM-DDTHH:mm:ss'),
): Promise<ChatResult> {
  const messages = buildMessages(history, input, now)
  const res = await chatCompletion(config, messages)
  if (!res.content) {
    return { ok: false, errorKind: res.errorKind ?? 'network', errorMessage: res.errorMessage ?? '无回复' }
  }
  const parsed = parseReply(res.content)
  if (!parsed) return { ok: true, reply: res.content, actions: [], toolMessages: [] }
  const actions = parsed.actions ?? []
  const toolMessages = await executeQueryActions(actions, now)
  const writeActions = actions.filter(a => !QUERY_TYPES.has(a.type))
  return { ok: true, reply: parsed.reply, actions: writeActions, toolMessages }
}
