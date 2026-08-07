import { describe, expect, it } from 'vitest'
import { exportJson, parseImportJson } from './transfer'

describe('exportJson / parseImportJson', () => {
  it('导出导入往返一致', () => {
    const events = [{ title: '开会', startTime: '2026-08-06T09:00:00', endTime: '2026-08-06T10:00:00', allDay: false, reminderOffsets: [10], repeat: 'none' as const }]
    const raw = exportJson(events)
    const parsed = parseImportJson(raw)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.events).toEqual(events)
  })

  it('非法 JSON 返回错误', () => {
    const parsed = parseImportJson('not json')
    expect(parsed.ok).toBe(false)
  })

  it('缺失字段返回错误', () => {
    const parsed = parseImportJson(JSON.stringify([{ title: '开会' }]))
    expect(parsed.ok).toBe(false)
  })
})
