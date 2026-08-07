import type { CalendarEvent } from '../db/types'

export type ExportEvent = Omit<CalendarEvent, 'id' | 'createdAt' | 'completed'>

export function exportJson(events: ExportEvent[]): string {
  return JSON.stringify({ app: 'rigui', version: 1, exportedAt: new Date().toISOString(), events }, null, 2)
}

export function parseImportJson(raw: string): { ok: true; events: ExportEvent[] } | { ok: false; error: string } {
  let data: unknown
  try { data = JSON.parse(raw) } catch { return { ok: false, error: '不是有效的 JSON 文件' } }
  if (typeof data !== 'object' || data === null || !Array.isArray((data as { events?: unknown }).events)) {
    return { ok: false, error: '缺少 events 数组' }
  }
  const events = (data as { events: unknown[] }).events
  for (const item of events) {
    const e = item as Record<string, unknown>
    if (typeof e.title !== 'string' || typeof e.startTime !== 'string' || typeof e.endTime !== 'string') {
      return { ok: false, error: '事件缺少 title/startTime/endTime' }
    }
  }
  return { ok: true, events: events as ExportEvent[] }
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
