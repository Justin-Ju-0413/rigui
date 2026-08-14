import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import { startForegroundScheduler } from './foreground'
import { db } from '../db/schema'
import { addEvent } from '../db/crud'

const memStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()

describe('startForegroundScheduler', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    memStorage.clear()
    vi.stubGlobal('localStorage', memStorage)
    vi.stubGlobal('Notification', class {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('通知成功后标记已通知；失败不标记、下个周期重试', async () => {
    const now = () => Date.parse('2026-08-06T08:00:00')
    await addEvent({ title: '晨会', startTime: '2026-08-06T08:00:00', endTime: '2026-08-06T08:30:00', allDay: false, reminderOffsets: [0], repeat: 'none' })
    const notify = vi.fn()
    const onError = vi.fn()
    notify.mockImplementationOnce(() => { throw new Error('boom') })

    vi.useFakeTimers()
    const stop = startForegroundScheduler({ now, notify, onError, intervalMs: 30000 })
    try {
      await vi.advanceTimersByTimeAsync(10)
      expect(notify).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('rigui_notified')).toBe('[]')

      await vi.advanceTimersByTimeAsync(30000)
      expect(notify).toHaveBeenCalledTimes(2)
      expect(onError).toHaveBeenCalledTimes(1)
      const marked = JSON.parse(localStorage.getItem('rigui_notified') ?? '[]') as string[]
      expect(marked).toContain('1-0-2026-08-06T08:00:00')

      await vi.advanceTimersByTimeAsync(30000)
      expect(notify).toHaveBeenCalledTimes(2)
    } finally {
      stop()
    }
  })

  it('周日到点：tick 触发周报推送（与事件提醒同通道）', async () => {
    const now = () => Date.parse('2026-08-09T20:00:00') // 周日 20:00
    await addEvent({ title: '晨会', startTime: '2026-08-03T09:00:00', endTime: '2026-08-03T09:30:00', allDay: false, reminderOffsets: [], repeat: 'none' })
    const notify = vi.fn()
    vi.useFakeTimers()
    const stop = startForegroundScheduler({ now, notify, onError: () => {}, intervalMs: 30000 })
    try {
      await vi.advanceTimersByTimeAsync(10)
      expect(notify).toHaveBeenCalledTimes(1)
      expect(notify.mock.calls[0][0]).toBe('本周简报')
      expect(String(notify.mock.calls[0][1])).toContain('完成 0/1 项')
      expect(localStorage.getItem('rigui_weekly_report_sent')).toBe('2026-08-03')
    } finally {
      stop()
    }
  })

  it('多个到期事件中单个失败不影响其他标记', async () => {
    const now = () => Date.parse('2026-08-06T08:00:00')
    await addEvent({ title: 'A', startTime: '2026-08-06T08:00:00', endTime: '2026-08-06T08:30:00', allDay: false, reminderOffsets: [0], repeat: 'none' })
    await addEvent({ title: 'B', startTime: '2026-08-06T08:00:00', endTime: '2026-08-06T08:30:00', allDay: false, reminderOffsets: [0], repeat: 'none' })
    const notify = vi.fn()
    notify.mockImplementationOnce(() => { throw new Error('boom') })

    vi.useFakeTimers()
    const stop = startForegroundScheduler({ now, notify, onError: () => {}, intervalMs: 30000 })
    try {
      await vi.advanceTimersByTimeAsync(10)
      await vi.advanceTimersByTimeAsync(30000)
      const marked = JSON.parse(localStorage.getItem('rigui_notified') ?? '[]') as string[]
      expect(marked).toContain('2-0-2026-08-06T08:00:00')
      expect(marked).toContain('1-0-2026-08-06T08:00:00')
      await vi.advanceTimersByTimeAsync(30000)
      expect(notify).toHaveBeenCalledTimes(3)
    } finally {
      stop()
    }
  })
})