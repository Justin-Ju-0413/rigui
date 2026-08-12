import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import dayjs from 'dayjs'
import WeeklyReportCard from './WeeklyReportCard'
import { LLMProvider } from '../context/LLMContext'
import { __setLLMTransport } from '../llm/client'
import { db } from '../db/schema'
import { setSetting } from '../db/settings'
import type { CalendarEvent, Goal } from '../db/types'

const mount = () => render(<LLMProvider><WeeklyReportCard /></LLMProvider>)

const seedEvent = async (over: Partial<CalendarEvent> & { startTime: string }) => {
  await db.events.add({
    title: '事件',
    endTime: dayjs(over.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
    allDay: false,
    reminderOffsets: [],
    repeat: 'none',
    completed: false,
    createdAt: '2026-08-01T00:00:00',
    ...over,
  })
}

const seedGoal = async (over: Partial<Goal> & { id?: number; name: string }) =>
  db.goals.add({
    startDate: '2026-08-10',
    createdAt: '2026-08-01T00:00:00',
    ...over,
  })

describe('WeeklyReportCard', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setSetting('llm_base_url', 'https://api.example.com/v1')
    await setSetting('llm_api_key', 'sk-test')
    await setSetting('llm_model', 'test-model')
  })

  it('空态：本周暂无日程且 AI 按钮禁用', async () => {
    mount()
    expect(await screen.findByTestId('weekly-report-empty')).toBeInTheDocument()
    expect(screen.getByTestId('weekly-report-ai')).toBeDisabled()
  })

  it('统计渲染：概览/时长/冲突', async () => {
    await seedEvent({ startTime: '2026-08-10T09:00:00', title: '开会', completed: true })
    await seedEvent({ startTime: '2026-08-10T09:30:00', title: '健身' })
    mount()
    const overview = await screen.findByTestId('weekly-report-overview')
    expect(overview.textContent).toContain('共 2 项')
    expect(overview.textContent).toContain('完成 1')
    expect(overview.textContent).toContain('50%')
    expect(overview.textContent).toContain('2小时')
    expect(screen.getByTestId('report-conflicts').textContent).toContain('开会 × 健身')
  })

  it('目标进度展示', async () => {
    const goalId = await seedGoal({ name: '学英语' })
    await seedEvent({ startTime: '2026-08-10T09:00:00', title: '学英语 · 第 1 次', relatedGoalId: goalId, completed: true })
    await seedEvent({ startTime: '2026-08-11T09:00:00', title: '学英语 · 第 2 次', relatedGoalId: goalId })
    mount()
    const text = await screen.findByText(/学英语/)
    expect(text.textContent).toContain('1/2')
  })

  it('切周后周范围标签变化', async () => {
    await seedEvent({ startTime: '2026-08-10T09:00:00' })
    const user = userEvent.setup()
    mount()
    await screen.findByTestId('weekly-report-overview')
    const before = screen.getByTestId('weekly-report-range').textContent
    await user.click(screen.getByLabelText('上一周'))
    const after = screen.getByTestId('weekly-report-range').textContent
    expect(after).not.toBe(before)
  })

  it('AI 分析成功展示 LLM 文本', async () => {
    await seedEvent({ startTime: '2026-08-10T09:00:00', title: '开会' })
    const restore = __setLLMTransport(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: '本周节奏适中，共 1 项日程。' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    const user = userEvent.setup()
    mount()
    await screen.findByTestId('weekly-report-overview')
    await user.click(screen.getByTestId('weekly-report-ai'))
    expect(await screen.findByTestId('weekly-report-ai-text')).toHaveTextContent('本周节奏适中')
    restore()
  })

  it('AI 分析失败展示错误', async () => {
    await seedEvent({ startTime: '2026-08-10T09:00:00' })
    const restore = __setLLMTransport(async () => new Response('', { status: 500 }))
    const user = userEvent.setup()
    mount()
    await screen.findByTestId('weekly-report-overview')
    await user.click(screen.getByTestId('weekly-report-ai'))
    expect(await screen.findByTestId('weekly-report-error')).toHaveTextContent(/AI 分析失败/)
    restore()
  })

  it('未配置 LLM 时提示先到设置页', async () => {
    await seedEvent({ startTime: '2026-08-10T09:00:00' })
    await db.settings.clear()
    const user = userEvent.setup()
    mount()
    await screen.findByTestId('weekly-report-overview')
    await user.click(screen.getByTestId('weekly-report-ai'))
    expect(await screen.findByTestId('weekly-report-error')).toHaveTextContent(/请先在设置页配置 LLM/)
  })
})
