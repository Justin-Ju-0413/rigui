import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import EventForm from './EventForm'
import { db } from '../db/schema'

describe('EventForm', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('标题必填校验', async () => {
    const user = userEvent.setup()
    render(<EventForm onSaved={() => {}} onCancel={() => {}} defaultStart="2026-08-06T09:00:00" />)
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('请输入标题')).toBeInTheDocument()
  })

  it('结束时间早于开始时间报错', async () => {
    const user = userEvent.setup()
    render(<EventForm onSaved={() => {}} onCancel={() => {}} defaultStart="2026-08-06T09:00:00" />)
    await user.type(screen.getByLabelText('标题'), '开会')
    await user.clear(screen.getByLabelText('开始时间'))
    await user.type(screen.getByLabelText('开始时间'), '2026-08-06T09:00')
    await user.clear(screen.getByLabelText('结束时间'))
    await user.type(screen.getByLabelText('结束时间'), '2026-08-06T08:00')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('结束时间必须晚于开始时间')).toBeInTheDocument()
  })

  it('合法提交调用 onSaved 并写入库', async () => {
    const user = userEvent.setup()
    let savedId: number | null = null
    render(<EventForm onSaved={id => { savedId = id }} onCancel={() => {}} defaultStart="2026-08-06T09:00:00" />)
    await user.type(screen.getByLabelText('标题'), '开会')
    await user.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(savedId).not.toBeNull())
    const count = await db.events.count()
    expect(count).toBe(1)
  })
})
