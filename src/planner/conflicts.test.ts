import { describe, expect, it } from 'vitest'
import { expandRecurring, hasOverlap, findConflicts } from './conflicts'
import type { CalendarEvent } from '../db/types'

const ev = (title: string, startTime: string, endTime: string, repeat: CalendarEvent['repeat'] = 'none'): CalendarEvent => ({
  id: 1, title, startTime, endTime, allDay: false, reminderOffsets: [], repeat, completed: false, createdAt: '',
})

describe('hasOverlap', () => {
  it('重叠区间返回 true', () => {
    expect(hasOverlap({ startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00' },
      { startTime: '2026-08-06T09:30:00', endTime: '2026-08-06T11:00:00' })).toBe(true)
  })
  it('紧邻区间（10:00 结束 / 10:00 开始）不重叠', () => {
    expect(hasOverlap({ startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00' },
      { startTime: '2026-08-06T10:00:00', endTime: '2026-08-06T11:00:00' })).toBe(false)
  })
  it('包含区间返回 true', () => {
    expect(hasOverlap({ startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T12:00:00' },
      { startTime: '2026-08-06T10:00:00', endTime: '2026-08-06T11:00:00' })).toBe(true)
  })
  it('完全不相交返回 false', () => {
    expect(hasOverlap({ startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00' },
      { startTime: '2026-08-06T13:00:00', endTime: '2026-08-06T14:00:00' })).toBe(false)
  })
})

describe('expandRecurring', () => {
  it('none 原样返回', () => {
    const e = ev('会', '2026-08-06T09:00:00', '2026-08-06T10:00:00')
    expect(expandRecurring(e, '2026-08-01T00:00:00', '2026-08-31T23:59:59')).toEqual([e])
  })
  it('weekly 展开到范围内所有实例', () => {
    const e = ev('周会', '2026-08-06T09:00:00', '2026-08-06T10:00:00', 'weekly')
    const out = expandRecurring(e, '2026-08-01T00:00:00', '2026-08-31T23:59:59')
    expect(out).toHaveLength(4)
    expect(out.map(o => o.startTime)).toEqual([
      '2026-08-06T09:00:00', '2026-08-13T09:00:00', '2026-08-20T09:00:00', '2026-08-27T09:00:00',
    ])
  })
  it('daily 展开', () => {
    const e = ev('晨会', '2026-08-06T09:00:00', '2026-08-06T09:30:00', 'daily')
    const out = expandRecurring(e, '2026-08-06T00:00:00', '2026-08-08T23:59:59')
    expect(out).toHaveLength(3)
  })
  it('monthly 展开', () => {
    const e = ev('对账', '2026-08-06T09:00:00', '2026-08-06T10:00:00', 'monthly')
    const out = expandRecurring(e, '2026-08-01T00:00:00', '2026-10-31T23:59:59')
    expect(out).toHaveLength(3)
  })
})

describe('findConflicts', () => {
  it('找到重叠的既有事件', () => {
    const existing = [ev('已有会', '2026-08-06T09:30:00', '2026-08-06T10:30:00')]
    const candidate = { ...ev('新会', '2026-08-06T09:00:00', '2026-08-06T10:00:00'), id: 2 }
    expect(findConflicts(existing, candidate, '2026-08-01T00:00:00', '2026-08-31T23:59:59').map(e => e.title)).toEqual(['已有会'])
  })
  it('重复事件与候选冲突时返回实例', () => {
    const existing = [ev('每周站会', '2026-08-06T09:30:00', '2026-08-06T10:00:00', 'weekly')]
    const candidate = { ...ev('新会', '2026-08-13T09:45:00', '2026-08-13T10:30:00'), id: 2 }
    const conflicts = findConflicts(existing, candidate, '2026-08-01T00:00:00', '2026-08-31T23:59:59')
    expect(conflicts[0].startTime).toBe('2026-08-13T09:30:00')
  })
  it('不重叠时返回空数组', () => {
    const existing = [ev('早会', '2026-08-06T09:00:00', '2026-08-06T10:00:00')]
    const candidate = ev('午休', '2026-08-06T12:00:00', '2026-08-06T13:00:00')
    expect(findConflicts(existing, candidate, '2026-08-01T00:00:00', '2026-08-31T23:59:59')).toEqual([])
  })
})
