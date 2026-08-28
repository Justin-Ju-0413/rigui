import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import GoalView from './GoalView'
import { db } from '../db/schema'
import { addGoal, getAllEvents } from '../db/crud'
import * as crud from '../db/crud'

const goalInput = (over: Record<string, unknown> = {}) => ({
  name: '学英语',
  startDate: '2026-08-10',
  tasks: [
    { id: 't1', name: '背单词', weeklyFrequency: 2, durationMinutes: 60 },
    { id: 't2', name: '听力', weeklyFrequency: 1, durationMinutes: 30 },
  ],
  ...over,
})

describe('GoalView', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('渲染目标卡：任务列表（名称、次数×时长）', async () => {
    await addGoal(goalInput())
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    expect(screen.getByText('背单词')).toBeInTheDocument()
    expect(screen.getByText('听力')).toBeInTheDocument()
    expect(screen.getByTestId('task-row-t1')).toHaveTextContent('每周 2 次')
    expect(screen.getByTestId('task-row-t1')).toHaveTextContent('60 分钟')
  })

  it('新建目标：点击新建 → 表单（默认一行任务）→ 保存 → 出现卡片', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await user.click(screen.getByTestId('goal-new-btn'))
    expect(screen.getByTestId('goal-form')).toBeInTheDocument()
    await user.type(screen.getByLabelText('目标名称'), '健身')
    await user.type(screen.getByLabelText('任务名 1'), '跑步')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('健身')
    await screen.findByText('跑步')
  })

  it('删除目标：确认条 → 确认后目标消失', async () => {
    const user = userEvent.setup()
    await addGoal(goalInput())
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getByRole('button', { name: '删除目标' }))
    expect(screen.getByTestId('goal-delete-confirm')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认删除' }))
    await waitFor(() => expect(screen.queryByText('学英语')).not.toBeInTheDocument())
  })

  it('删除确认条可取消', async () => {
    const user = userEvent.setup()
    await addGoal(goalInput())
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getByRole('button', { name: '删除目标' }))
    await user.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByTestId('goal-delete-confirm')).not.toBeInTheDocument())
    expect(screen.getByText('学英语')).toBeInTheDocument()
  })

  it('任务排期一周 → 预览（条数与任务频次一致、标题=任务名）→ 全部确认入库并消失', async () => {
    const user = userEvent.setup()
    await addGoal(goalInput())
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getAllByTestId('task-schedule-btn')[0]) // t1 背单词
    await waitFor(() => expect(screen.getByTestId('schedule-preview')).toBeInTheDocument())
    expect(screen.getAllByTestId('schedule-item')).toHaveLength(2)
    expect(screen.getByTestId('schedule-success')).toHaveTextContent('已排 2/2 次')
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('背单词')
    await user.click(screen.getByRole('button', { name: '全部确认' }))
    await waitFor(() => expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument())
    const events = await getAllEvents()
    expect(events).toHaveLength(2)
    expect(events.every(e => e.relatedGoalId !== undefined && e.relatedTaskId === 't1')).toBe(true)
    expect(events.every(e => e.title === '背单词')).toBe(true)
  })

  it('放弃重新排丢弃预览且不入库', async () => {
    const user = userEvent.setup()
    await addGoal(goalInput())
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getAllByTestId('task-schedule-btn')[0])
    await waitFor(() => expect(screen.getByTestId('schedule-preview')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '放弃' }))
    await waitFor(() => expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument())
    expect(await getAllEvents()).toHaveLength(0)
  })

  it('删除任务：确认条显示级联数量 → 确认后任务与事件消失', async () => {
    const user = userEvent.setup()
    const gid = await addGoal(goalInput())
    const { addEvent } = await import('../db/crud')
    await addEvent({ title: '背单词', startTime: '2026-08-10T09:00:00', endTime: '2026-08-10T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none', relatedGoalId: gid, relatedTaskId: 't1' })
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getAllByTestId('task-delete-btn')[0])
    expect(screen.getByTestId('task-delete-confirm')).toHaveTextContent(/将同时删除 1 条关联事件/)
    await user.click(screen.getByRole('button', { name: '确认删除任务' }))
    await waitFor(() => expect(screen.queryByText('背单词')).not.toBeInTheDocument())
    expect(screen.getByText('听力')).toBeInTheDocument()
    const events = await getAllEvents()
    expect(events).toHaveLength(0)
  })

  it('编辑目标：回填任务并可修改后保存', async () => {
    const user = userEvent.setup()
    await addGoal(goalInput())
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findByText('学英语')
    await user.click(screen.getByRole('button', { name: '编辑' }))
    const input = screen.getByLabelText('目标名称')
    expect(input).toHaveValue('学英语')
    expect(screen.getByLabelText('任务名 1')).toHaveValue('背单词')
    await user.clear(input)
    await user.type(input, '学英语（进阶）')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByText('学英语（进阶）')
  })

  it('任务排期 → 全部确认中途失败（addEvent 抛错）→ 显示错误并保留未入库槽', async () => {
    const user = userEvent.setup()
    const originalAdd = crud.addEvent
    let calls = 0
    const spy = vi.spyOn(crud, 'addEvent').mockImplementation(async (input) => {
      calls++
      if (calls === 2) throw new Error('indexeddb boom')
      return originalAdd(input)
    })
    try {
      await addGoal(goalInput())
      render(<MemoryRouter><GoalView /></MemoryRouter>)
      await screen.findByText('学英语')
      await user.click(screen.getAllByTestId('task-schedule-btn')[0])
      await waitFor(() => expect(screen.getByTestId('schedule-preview')).toBeInTheDocument())
      expect(screen.getAllByTestId('schedule-item')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: '全部确认' }))
      await waitFor(() => expect(screen.getByTestId('schedule-confirm-error')).toBeInTheDocument())
      expect(screen.getByTestId('schedule-confirm-error')).toHaveTextContent(/剩余 1 条/)
      expect(screen.getAllByTestId('schedule-item')).toHaveLength(1)
      expect(await getAllEvents()).toHaveLength(1)
    } finally {
      spy.mockRestore()
    }
  })

  it('旧目标（无 tasks）：卡片合成默认任务，可排期', async () => {
    const user = userEvent.setup()
    const gid = await addGoal({ name: '健身', startDate: '2026-08-10', weeklyFrequency: 2, durationMinutes: 60 } as never)
    render(<MemoryRouter><GoalView /></MemoryRouter>)
    await screen.findAllByText('健身')
    expect(screen.getAllByTestId('task-schedule-btn')).toHaveLength(1)
    await user.click(screen.getAllByTestId('task-schedule-btn')[0])
    await waitFor(() => expect(screen.getByTestId('schedule-preview')).toBeInTheDocument())
    expect(screen.getAllByTestId('schedule-item')).toHaveLength(2)
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('健身')
    await user.click(screen.getByRole('button', { name: '全部确认' }))
    await waitFor(() => expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument())
    const events = await getAllEvents()
    expect(events).toHaveLength(2)
    expect(events.every(e => e.relatedGoalId === gid)).toBe(true)
  })
})