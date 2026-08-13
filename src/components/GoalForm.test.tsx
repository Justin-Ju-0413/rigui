import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import GoalForm from './GoalForm'
import { db } from '../db/schema'
import { addGoal, getAllGoals } from '../db/crud'
import type { Goal } from '../db/types'

describe('GoalForm', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('新建：默认一行任务，填写后保存携带 tasks', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('目标名称'), '学英语')
    await user.type(screen.getByLabelText('任务名 1'), '背单词')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [g] = await getAllGoals()
    expect(g.tasks).toHaveLength(1)
    expect(g.tasks[0]).toMatchObject({ name: '背单词', weeklyFrequency: 1, durationMinutes: 60 })
    expect(g.tasks[0].id).toBeTruthy()
  })

  it('多任务：添加任务行并各自设置参数', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('目标名称'), '学英语')
    await user.type(screen.getByLabelText('任务名 1'), '背单词')
    await user.clear(screen.getByLabelText('每周次数 1'))
    await user.type(screen.getByLabelText('每周次数 1'), '3')
    await user.click(screen.getByRole('button', { name: '添加任务' }))
    await user.type(screen.getByLabelText('任务名 2'), '听力')
    await user.clear(screen.getByLabelText('单次时长 2'))
    await user.type(screen.getByLabelText('单次时长 2'), '30')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [g] = await getAllGoals()
    expect(g.tasks).toHaveLength(2)
    expect(g.tasks[0]).toMatchObject({ name: '背单词', weeklyFrequency: 3, durationMinutes: 60 })
    expect(g.tasks[1]).toMatchObject({ name: '听力', weeklyFrequency: 1, durationMinutes: 30 })
  })

  it('校验：目标名必填', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByTestId('goal-form-error')).toHaveTextContent('请输入目标名称')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('校验：任务名不能为空', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('目标名称'), '学英语')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByTestId('goal-form-error')).toHaveTextContent('任务名不能为空')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('校验：删除所有任务行后提示至少一个任务', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('目标名称'), '学英语')
    await user.click(screen.getByRole('button', { name: '删除任务 1' }))
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByTestId('goal-form-error')).toHaveTextContent('至少需要一个任务')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('编辑模式：回填任务并可修改后保存', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const id = await addGoal({
      name: '健身', startDate: '2026-08-10',
      tasks: [{ id: 't1', name: '跑步', weeklyFrequency: 3, durationMinutes: 45 }],
    })
    render(<GoalForm initial={{
      id, name: '健身', startDate: '2026-08-10', createdAt: '',
      tasks: [{ id: 't1', name: '跑步', weeklyFrequency: 3, durationMinutes: 45 }],
    }} onSaved={onSaved} onCancel={() => {}} />)
    expect(screen.getByLabelText('目标名称')).toHaveValue('健身')
    expect(screen.getByLabelText('任务名 1')).toHaveValue('跑步')
    expect(screen.getByLabelText('每周次数 1')).toHaveValue(3)
    await user.clear(screen.getByLabelText('任务名 1'))
    await user.type(screen.getByLabelText('任务名 1'), '深蹲')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(id))
    const [g] = await getAllGoals()
    expect(g.tasks[0]).toMatchObject({ id: 't1', name: '深蹲' })
  })

  it('编辑旧目标（无 tasks）：自动合成默认任务行', async () => {
    const onSaved = vi.fn()
    // 模拟 v1.4 旧数据（无 tasks 字段）
    const legacy = {
      id: 7, name: '学英语', startDate: '2026-08-10', createdAt: '',
      weeklyFrequency: 2, durationMinutes: 60,
    } as unknown as Goal
    render(<GoalForm initial={legacy} onSaved={onSaved} onCancel={() => {}} />)
    expect(screen.getByLabelText('任务名 1')).toHaveValue('学英语')
    expect(screen.getByLabelText('每周次数 1')).toHaveValue(2)
    expect(screen.getByLabelText('单次时长 1')).toHaveValue(60)
  })
})