import { describe, expect, it } from 'vitest'
import { validateParsedEvent, parseEventToInput } from './parseEvent'
import { buildParsePrompt } from './prompt'
import { __setLLMTransport } from '../llm/client'
import type { LLMConfig } from '../llm/types'

const config: LLMConfig = { baseUrl: 'https://api.example.com/v1', apiKey: 'sk-test', model: 'test-model' }
const NOW = '2026-08-06T08:00:00'

const respond = (content: string) =>
  __setLLMTransport(async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

describe('buildParsePrompt', () => {
  it('注入当前时间、时区与近期日程', () => {
    const p = buildParsePrompt('下周二下午3点和老王开会', NOW, ['2026-08-06 09:00 开会'])
    expect(p.system).toContain('2026-08-06')
    expect(p.system).toContain('Asia/Shanghai')
    expect(p.system).toContain('2026-08-06 09:00 开会')
    expect(p.user).toContain('下周二下午3点和老王开会')
  })
})

describe('validateParsedEvent', () => {
  it('合法对象通过', () => {
    const r = validateParsedEvent({ title: '开会', startTime: '2026-08-11T15:00:00' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.title).toBe('开会')
  })
  it('缺 title 报错', () => {
    const r = validateParsedEvent({ startTime: '2026-08-11T15:00:00' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0]).toBe('缺少 title')
  })
  it('时间格式非法报错', () => {
    const r = validateParsedEvent({ title: '开会', startTime: '明天下午' })
    expect(r.ok).toBe(false)
  })
  it('repeat 枚举非法报错', () => {
    const r = validateParsedEvent({ title: '开会', startTime: '2026-08-11T15:00:00', repeat: 'yearly' })
    expect(r.ok).toBe(false)
  })
  it('endTime 早于 startTime 报错', () => {
    const r = validateParsedEvent({ title: '开会', startTime: '2026-08-11T15:00:00', endTime: '2026-08-11T14:00:00' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('endTime 必须晚于 startTime')
  })
  it('endTime 等于 startTime 报错', () => {
    const r = validateParsedEvent({ title: '开会', startTime: '2026-08-11T15:00:00', endTime: '2026-08-11T15:00:00' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain('endTime 必须晚于 startTime')
  })
  it('endTime 晚于 startTime 通过', () => {
    const r = validateParsedEvent({ title: '开会', startTime: '2026-08-11T15:00:00', endTime: '2026-08-11T16:00:00' })
    expect(r.ok).toBe(true)
  })
  it('非法输入（非对象）报错', () => {
    const r = validateParsedEvent('oops')
    expect(r.ok).toBe(false)
  })
})

describe('parseEventToInput', () => {
  it('成功解析返回结构化输入', async () => {
    respond('{"title":"开会","startTime":"2026-08-11T15:00:00","endTime":"2026-08-11T16:00:00","location":"会议室","reminderOffsets":[10],"repeat":"none"}')
    const r = await parseEventToInput(config, '下周二下午3点和老王开会', NOW, [])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.title).toBe('开会')
  })
  it('非法 schema 自动重试一次后成功', async () => {
    let calls = 0
    __setLLMTransport(async () => {
      calls += 1
      const content = calls === 1 ? '{"title":123}' : '{"title":"开会","startTime":"2026-08-11T15:00:00"}'
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    })
    const r = await parseEventToInput(config, '开会', NOW, [])
    expect(calls).toBe(2)
    expect(r.ok).toBe(true)
  })
  it('两次非法 schema 返回错误信息', async () => {
    respond('{"title":123}')
    const r = await parseEventToInput(config, '开会', NOW, [])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.some(e => e.includes('title'))).toBe(true)
  })
  it('LLM 调用失败返回错误且不重试', async () => {
    let calls = 0
    __setLLMTransport(async () => { calls += 1; throw new TypeError('Failed to fetch') })
    const r = await parseEventToInput(config, '开会', NOW, [])
    expect(calls).toBe(1)
    expect(r.ok).toBe(false)
  })
  it('重试请求携带首次校验错误提示', async () => {
    const bodies: string[] = []
    __setLLMTransport(async (_url, init) => {
      bodies.push(String(init?.body))
      const content = bodies.length === 1 ? '{"title":123}' : '{"title":"开会","startTime":"2026-08-11T15:00:00"}'
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
    })
    await parseEventToInput(config, '开会', NOW, [])
    expect(bodies[1]).toContain('缺少 title')
  })
})
