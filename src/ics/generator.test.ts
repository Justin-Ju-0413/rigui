import { describe, expect, it } from 'vitest'
import { generateIcs } from './generator'

const ev = (title: string, startTime: string, endTime: string, location?: string, offsets: number[] = []) => ({
  id: 1, title, startTime, endTime, allDay: false, location, reminderOffsets: offsets, repeat: 'none' as const, completed: false, createdAt: '',
})

describe('generateIcs', () => {
  it('基础事件含 VEVENT 头尾', () => {
    const ics = generateIcs([ev('开会', '2026-08-06T09:00:00', '2026-08-06T10:00:00', '会议室A')])
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART:20260806T090000')
    expect(ics).toContain('DTEND:20260806T100000')
    expect(ics).toContain('LOCATION:会议室A')
    expect(ics).toContain('SUMMARY:开会')
    expect(ics).toContain('END:VCALENDAR')
  })

  it('提醒偏移生成 VALARM', () => {
    const ics = generateIcs([ev('晨会', '2026-08-06T09:00:00', '2026-08-06T09:30:00', undefined, [10, 5])])
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT10M')
    expect(ics).toContain('TRIGGER:-PT5M')
  })

  it('重复事件展开为多个 VEVENT', () => {
    const weekly = { ...ev('周会', '2026-08-06T09:00:00', '2026-08-06T10:00:00'), repeat: 'weekly' as const }
    const ics = generateIcs([weekly], '2026-08-01T00:00:00', '2026-08-31T23:59:59')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4)
    expect(ics).toContain('DTSTART:20260813T090000')
  })

  it('时间字段为本地时间无时区后缀', () => {
    const ics = generateIcs([ev('会', '2026-08-06T09:00:00', '2026-08-06T10:00:00')])
    expect(ics).toContain('DTSTART:20260806T090000')
    expect(ics).not.toContain('DTSTART:20260806T090000Z')
  })

  it('特殊字符转义', () => {
    const ics = generateIcs([ev('会;议,分', '2026-08-06T09:00:00', '2026-08-06T10:00:00')])
    expect(ics).toContain('SUMMARY:会\\;议\\,分')
  })

  it('以 CRLF 结尾（RFC 5545 要求每行 CRLF）', () => {
    const ics = generateIcs([ev('会', '2026-08-06T09:00:00', '2026-08-06T10:00:00')])
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toMatch(/\r\n\r\n/)
  })
})
