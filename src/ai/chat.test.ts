import { describe, expect, it, beforeEach } from 'vitest'
import { buildMessages, executeQueryActions, parseReply, sendChatMessage } from './chat'
import { buildParsePrompt } from './prompt'
import { __setLLMTransport } from '../llm/client'
import type { LLMConfig } from '../llm/types'
import { db } from '../db/schema'
import { addEvent, addGoal } from '../db/crud'

const config: LLMConfig = { baseUrl: 'https://api.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
const NOW = '2026-08-15T08:00:00'

const respond = (content: string) =>
  __setLLMTransport(async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

describe('parseReply', () => {
  it('直接 JSON 解析', () => {
    const r = parseReply(JSON.stringify({ reply: '好的', actions: [{ type: 'create_event', payload: { title: '开会', startTime: '2026-08-16T15:00:00' } }] }))
    expect(r?.reply).toBe('好的')
    expect(r?.actions?.[0].type).toBe('create_event')
  })

  it('剥离 markdown 代码块后解析', () => {
    const r = parseReply('```json\n{"reply": "已安排"}\n```')
    expect(r?.reply).toBe('已安排')
  })

  it('非法 JSON 返回 null', () => {
    expect(parseReply('这不是 JSON')).toBeNull()
  })

  it('无 actions 时仅回复', () => {
    const r = parseReply(JSON.stringify({ reply: '你好' }))
    expect(r?.reply).toBe('你好')
    expect(r?.actions).toBeUndefined()
  })
})

describe('buildMessages', () => {
  it('系统提示注入当前时间,历史截断最近 20 条,末尾为用户输入', () => {
    const history = Array.from({ length: 25 }, (_, i) => ({ role: 'user' as const, content: `消息${i}`, createdAt: `2026-08-15T0${i % 10}:00:00` }))
    const msgs = buildMessages(history, '明天有什么安排？', NOW)
    expect(msgs[0].role).toBe('system')
    expect(msgs[0].content).toContain('2026-08-15')
    expect(msgs).toHaveLength(1 + 20 + 1)
    expect(msgs[1].content).toBe('消息5')
    expect(msgs.at(-1)).toEqual({ role: 'user', content: '明天有什么安排？' })
  })
})

describe('executeQueryActions', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('query_events(today) 返回当日日程文本', async () => {
    await addEvent({ title: '开会', startTime: '2026-08-15T09:00:00', endTime: '2026-08-15T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    const texts = await executeQueryActions([{ type: 'query_events', payload: { range: 'today' } }], NOW)
    expect(texts).toHaveLength(1)
    expect(texts[0]).toContain('开会')
    expect(texts[0]).toContain('09:00')
  })

  it('query_events(today) 无日程返回空提示', async () => {
    const texts = await executeQueryActions([{ type: 'query_events', payload: { range: 'today' } }], NOW)
    expect(texts[0]).toContain('没有日程')
  })

  it('query_goals 返回目标文本', async () => {
    await addGoal({ name: '学英语', startDate: '2026-08-10', tasks: [], weeklyFrequency: 3, durationMinutes: 60 })
    const texts = await executeQueryActions([{ type: 'query_goals' }], NOW)
    expect(texts[0]).toContain('学英语')
  })

  it('非查询动作不产生回填', async () => {
    const texts = await executeQueryActions([{ type: 'create_event', payload: { title: 'x', startTime: '2026-08-16T09:00:00' } }], NOW)
    expect(texts).toHaveLength(0)
  })
})

describe('sendChatMessage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('解析回复并执行查询动作,返回写类动作与回填', async () => {
    await addEvent({ title: '健身', startTime: '2026-08-15T19:00:00', endTime: '2026-08-15T20:00:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    respond(JSON.stringify({
      reply: '已安排。你今晚还有健身。',
      actions: [
        { type: 'create_event', payload: { title: '开会', startTime: '2026-08-16T15:00:00' } },
        { type: 'query_events', payload: { range: 'today' } },
      ],
    }))
    const r = await sendChatMessage(config, [], '明天下午3点开会', NOW)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reply).toContain('已安排')
    expect(r.actions).toHaveLength(1)
    expect(r.actions[0].type).toBe('create_event')
    expect(r.toolMessages[0]).toContain('健身')
  })

  it('LLM 返回非 JSON 文本时当纯文本回复', async () => {
    respond('明天下午3点开会可以。')
    const r = await sendChatMessage(config, [], '明天下午3点开会', NOW)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reply).toBe('明天下午3点开会可以。')
    expect(r.actions).toHaveLength(0)
  })

  it('LLM 网络失败返回 ok:false 与错误信息', async () => {
    __setLLMTransport(async () => new Response('boom', { status: 500 }))
    const r = await sendChatMessage(config, [], 'hi', NOW)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKind).toBe('http')
  })

  it('未配置 API Key 返回 config 错误', async () => {
    const r = await sendChatMessage({ ...config, apiKey: '' }, [], 'hi', NOW)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorKind).toBe('config')
  })
})

describe('buildParsePrompt 兼容', () => {
  it('现有单轮解析提示仍可用(对话引擎不破坏)', () => {
    const p = buildParsePrompt('明天下午开会', NOW, [])
    expect(p.system).toContain('日程解析助手')
  })
})
