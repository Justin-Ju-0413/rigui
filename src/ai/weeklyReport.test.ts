import { describe, expect, it, vi } from 'vitest'
import { __setLLMTransport } from '../llm/client'
import type { LLMConfig } from '../llm/types'
import type { ReportStats } from '../stats/report'
import { buildReportPrompt, generateWeeklyReport } from './weeklyReport'

const config: LLMConfig = { baseUrl: 'https://mock.local/v1', apiKey: 'sk-test', model: 'test-model' }

const stats: ReportStats = {
  weekStart: '2026-08-10T00:00:00',
  weekEnd: '2026-08-16T23:59:59',
  overview: { total: 2, completed: 1, completedRate: 0.5, totalMinutes: 120 },
  goalProgress: [],
  timeDistribution: Array.from({ length: 7 }, (_, day) => ({ day, count: 0, minutes: 0 })),
  dayParts: [
    { part: 'morning', count: 0 },
    { part: 'afternoon', count: 0 },
    { part: 'evening', count: 0 },
  ],
  freeSlots: { totalMinutes: 840, longestMinutes: 840, perDay: Array.from({ length: 7 }, (_, day) => ({ day, minutes: 0 })) },
  conflicts: [],
  nextWeek: { plannedCount: 0, unfinishedGoals: [] },
}

describe('buildReportPrompt', () => {
  it('system 约束中文客观转述，user 含统计 JSON', () => {
    const { system, user } = buildReportPrompt(stats, '2026-08-10 ~ 08-16')
    expect(system).toContain('客观转述')
    expect(system).toContain('200 字')
    expect(user).toContain('2026-08-10 ~ 08-16')
    expect(user).toContain('"total":2')
  })
})

describe('generateWeeklyReport', () => {
  it('成功时返回 LLM 文本', async () => {
    const restore = __setLLMTransport(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: '本周共 2 项日程…' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    const result = await generateWeeklyReport(config, stats, '2026-08-10 ~ 08-16')
    expect(result).toEqual({ ok: true, content: '本周共 2 项日程…' })
    restore()
  })

  it('未配置 Key 时返回 ok:false', async () => {
    const result = await generateWeeklyReport({ ...config, apiKey: '' }, stats, 'x')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join('；')).toContain('API Key')
  })

  it('HTTP 错误返回 ok:false', async () => {
    const restore = __setLLMTransport(async () => new Response('', { status: 500 }))
    const result = await generateWeeklyReport(config, stats, 'x')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join('；')).toContain('服务端错误')
    restore()
  })
})
