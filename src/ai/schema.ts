import dayjs from 'dayjs'

export interface ParsedEventInput {
  title: string
  startTime: string
  endTime?: string
  allDay?: boolean
  location?: string
  reminderOffsets?: number[]
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly'
}

const REPEAT_VALUES = new Set(['none', 'daily', 'weekly', 'monthly'])

export type ValidateResult = { ok: true; data: ParsedEventInput } | { ok: false; errors: string[] }

export function validateParsedEvent(raw: unknown): ValidateResult {
  const errors: string[] = []
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errors: ['输出必须是 JSON 对象'] }
  }
  const obj = raw as Record<string, unknown>
  if (typeof obj.title !== 'string' || obj.title.trim() === '') errors.push('缺少 title')
  if (typeof obj.startTime !== 'string' || !dayjs(obj.startTime).isValid()) errors.push('startTime 必须是合法时间')
  if (obj.endTime !== undefined && (typeof obj.endTime !== 'string' || !dayjs(obj.endTime).isValid())) errors.push('endTime 必须是合法时间')
  if (obj.allDay !== undefined && typeof obj.allDay !== 'boolean') errors.push('allDay 必须是布尔值')
  if (obj.location !== undefined && typeof obj.location !== 'string') errors.push('location 必须是字符串')
  if (obj.reminderOffsets !== undefined && (!Array.isArray(obj.reminderOffsets) || obj.reminderOffsets.some(o => typeof o !== 'number' || o < 0))) {
    errors.push('reminderOffsets 必须是非负数字数组')
  }
  if (obj.repeat !== undefined && (typeof obj.repeat !== 'string' || !REPEAT_VALUES.has(obj.repeat))) {
    errors.push('repeat 必须是 none|daily|weekly|monthly')
  }
  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    data: {
      title: (obj.title as string).trim(),
      startTime: dayjs(obj.startTime as string).format('YYYY-MM-DDTHH:mm:ss'),
      ...(typeof obj.endTime === 'string' ? { endTime: dayjs(obj.endTime).format('YYYY-MM-DDTHH:mm:ss') } : {}),
      ...(typeof obj.allDay === 'boolean' ? { allDay: obj.allDay } : {}),
      ...(typeof obj.location === 'string' && obj.location.trim() ? { location: obj.location.trim() } : {}),
      ...(Array.isArray(obj.reminderOffsets) ? { reminderOffsets: obj.reminderOffsets } : {}),
      ...(typeof obj.repeat === 'string' ? { repeat: obj.repeat as ParsedEventInput['repeat'] } : {}),
    },
  }
}
