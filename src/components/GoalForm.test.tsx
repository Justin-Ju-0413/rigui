import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GoalForm from './GoalForm'

describe('GoalForm', () => {
  it('新建：名校验必填', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByTestId('goal-form-error')).toHaveTextContent('请输入目标名称')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('新建：填写有效字段回调 onSaved', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm onSaved={onSaved} onCancel={() => {}} />)
    await user.type(screen.getByLabelText('目标名称'), '学英语')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onSaved.mock.calls[0][0]).toBeGreaterThanOrEqual(1)
  })

  it('编辑模式：初始值渲染且保存调用 update 路径（通过 onSaved 回调携带 id）', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<GoalForm initial={{ id: 5, name: '健身', startDate: '2026-08-10', weeklyFrequency: 3, durationMinutes: 45, createdAt: '' }} onSaved={onSaved} onCancel={() => {}} />)
    expect(screen.getByLabelText('目标名称')).toHaveValue('健身')
    expect(screen.getByLabelText('每周次数')).toHaveValue(3)
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(5))
  })
})
