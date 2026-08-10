import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { db } from '../db/schema'
import { addEvent, addGoal } from '../db/crud'
import { useGoals } from './useGoals'

function Harness({ onReady }: { onReady: (api: ReturnType<typeof useGoals>) => void }) {
  const api = useGoals()
  onReady(api)
  return <div data-testid="goal-count">{api.goals.length}</div>
}

describe('useGoals', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('初始加载 goals 与全量 events', async () => {
    const gid = await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 1, durationMinutes: 60 })
    await addEvent({ title: '事件A', startTime: '2026-08-10T09:00:00', endTime: '2026-08-10T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none', relatedGoalId: gid })
    let api: ReturnType<typeof useGoals> | null = null
    render(<Harness onReady={a => { api = a }} />)
    await waitFor(() => expect(api?.goals).toHaveLength(1))
    expect(api!.events).toHaveLength(1)
    expect(api!.events[0].relatedGoalId).toBe(gid)
  })

  it('save 新增目标并刷新', async () => {
    let api: ReturnType<typeof useGoals> | null = null
    render(<Harness onReady={a => { api = a }} />)
    await waitFor(() => expect(api).not.toBeNull())
    await api!.save({ name: '学日语', startDate: '2026-08-11', weeklyFrequency: 3, durationMinutes: 45 })
    await waitFor(() => expect(api!.goals).toHaveLength(1))
    expect(api!.goals[0].name).toBe('学日语')
  })

  it('removeCascade 级联删除并返回删除事件数', async () => {
    const gid = await addGoal({ name: '学英语', startDate: '2026-08-10', weeklyFrequency: 1, durationMinutes: 60 })
    await addEvent({ title: '任务', startTime: '2026-08-10T09:00:00', endTime: '2026-08-10T10:00:00', allDay: false, reminderOffsets: [], repeat: 'none', relatedGoalId: gid })
    let api: ReturnType<typeof useGoals> | null = null
    render(<Harness onReady={a => { api = a }} />)
    await waitFor(() => expect(api?.goals).toHaveLength(1))
    const n = await api!.removeCascade(gid)
    expect(n).toBe(1)
    await waitFor(() => expect(api!.goals).toHaveLength(0))
    expect(api!.events).toHaveLength(0)
  })
})
