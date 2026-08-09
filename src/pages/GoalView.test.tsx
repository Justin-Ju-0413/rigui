import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import GoalView from './GoalView'
import { db } from '../db/schema'
import { addGoal, getAllEvents } from '../db/crud'

describe('GoalView', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('渲染已存在目标卡片（名称、频次×时长、进度占位）', async () => {
    await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 2, durationMinutes: 60 })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    expect(screen.getByTestId('goal-frequency')).toHaveTextContent('每周 2 次')
    expect(screen.getByTestId('goal-duration')).toHaveTextContent('60 分钟')
    expect(screen.getByTestId('goal-week-progress')).toHaveTextContent(/本周 \d+\/2 已排/)
  })

  it('新建目标：点击新建 → 表单 → 保存 → 出现卡片', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: '新建目标' }))
    expect(screen.getByTestId('goal-form')).toBeInTheDocument()
    await user.type(screen.getByLabelText('目标名称'), '健身')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('健身')
  })

  it('删除目标：确认条 → 确认后目标消失', async () => {
    const user = userEvent.setup()
    await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 1, durationMinutes: 60 })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getByRole('button', { name: '删除' }))
    expect(screen.getByTestId('goal-delete-confirm')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(screen.queryByText('学英语')).not.toBeInTheDocument())
  })

  it('删除确认条可取消', async () => {
    const user = userEvent.setup()
    await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 2, durationMinutes: 60 })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getByRole('button', { name: '删除' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByTestId('goal-delete-confirm')).not.toBeInTheDocument())
    expect(screen.getByText('学英语')).toBeInTheDocument()
  })

  it('排期一周 → 预览出现任务槽（条数与频次一致）→ 全部确认后入库并消失', async () => {
    const user = userEvent.setup()
    await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 2, durationMinutes: 60 })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getAllByTestId('goal-schedule-btn')[0])
    await waitFor(() => expect(screen.getByTestId('schedule-preview')).toBeInTheDocument())
    expect(screen.getAllByTestId('schedule-item')).toHaveLength(2)
    expect(screen.getByTestId('schedule-success')).toHaveTextContent(/已排 2\/2 次/)
    await user.click(screen.getByRole('button', { name: '全部确认' }))
    await waitFor(() => expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument())
    const events = await getAllEvents()
    expect(events).toHaveLength(2)
    expect(events.every(e => e.relatedGoalId !== undefined)).toBe(true)
  })

  it('放弃重新排丢弃预览且不入库', async () => {
    const user = userEvent.setup()
    await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 2, durationMinutes: 60 })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getAllByTestId('goal-schedule-btn')[0])
    await waitFor(() => expect(screen.getByTestId('schedule-preview')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '放弃' }))
    await waitFor(() => expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument())
    expect(await getAllEvents()).toHaveLength(0)
  })

  it('编辑目标：回填并可修改后保存', async () => {
    const user = userEvent.setup()
    await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 2, durationMinutes: 60 })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getByRole('button', { name: '编辑' }))
    const input = screen.getByLabelText('目标名称')
    expect(input).toHaveValue('学英语')
    await user.clear(input)
    await user.type(input, '学英语（进阶）')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('学英语（进阶）')
  })
})
