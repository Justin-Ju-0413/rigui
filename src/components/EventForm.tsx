import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { CalendarEvent, RepeatRule } from '../db/types'
import { findConflicts } from '../planner/conflicts'
import { useEvents } from '../hooks/useEvents'

interface Props {
  initial?: Partial<CalendarEvent>
  defaultStart?: string
  onSaved: (id: number) => void
  onCancel: () => void
}

export default function EventForm({ initial, defaultStart, onSaved, onCancel }: Props) {
  const { events, save, update } = useEvents()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [startTime, setStartTime] = useState(initial?.startTime ?? defaultStart ?? dayjs().format('YYYY-MM-DDTHH:mm'))
  const [endTime, setEndTime] = useState(initial?.endTime ?? dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'))
  const [location, setLocation] = useState(initial?.location ?? '')
  const [reminder, setReminder] = useState(initial?.reminderOffsets?.[0] ?? 0)
  const [repeat, setRepeat] = useState<RepeatRule>(initial?.repeat ?? 'none')
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<string[]>([])

  const normalized = useMemo(() => {
    const start = dayjs(startTime).format('YYYY-MM-DDTHH:mm:ss')
    const end = dayjs(endTime).format('YYYY-MM-DDTHH:mm:ss')
    return { start, end }
  }, [startTime, endTime])

  const validate = (): string | null => {
    if (!title.trim()) return '请输入标题'
    if (dayjs(endTime).isBefore(dayjs(startTime))) return '结束时间必须晚于开始时间'
    if (reminder < 0) return '提醒时间不能为负'
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    setError(err ?? '')
    if (err) return
    const input: Omit<CalendarEvent, 'id' | 'createdAt' | 'completed'> = {
      title: title.trim(),
      startTime: normalized.start,
      endTime: normalized.end,
      allDay: false,
      location: location.trim() || undefined,
      reminderOffsets: reminder > 0 ? [reminder] : [],
      repeat,
    }
    const candidate = { ...input, id: initial?.id, completed: initial?.completed ?? false, createdAt: '' }
    const found = findConflicts(events, candidate, '2000-01-01T00:00:00', '2100-12-31T23:59:59')
    setConflicts(found.map(e => `${e.title}（${dayjs(e.startTime).format('MM-DD HH:mm')}）`))
    if (found.length > 0) return
    const id = initial?.id ? (await update(initial.id, input), initial.id) : await save(input)
    onSaved(id)
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="space-y-3 p-4" data-testid="event-form">
      <input data-testid="title-input" aria-label="标题" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="事件标题" className="w-full rounded-lg border p-2" />
      <div className="flex gap-2">
        <label className="flex-1 text-sm">开始时间
          <input type="datetime-local" aria-label="开始时间" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full rounded-lg border p-2" />
        </label>
        <label className="flex-1 text-sm">结束时间
          <input type="datetime-local" aria-label="结束时间" value={endTime} onChange={e => setEndTime(e.target.value)}
            className="w-full rounded-lg border p-2" />
        </label>
      </div>
      <div className="flex gap-2">
        <label className="flex-1 text-sm">地点
          <input aria-label="地点" value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-lg border p-2" />
        </label>
        <label className="w-28 text-sm">提醒(分钟)
          <input type="number" min={0} aria-label="提醒" value={reminder} onChange={e => setReminder(Number(e.target.value))} className="w-full rounded-lg border p-2" />
        </label>
      </div>
      <label className="text-sm">重复
        <select aria-label="重复" value={repeat} onChange={e => setRepeat(e.target.value as RepeatRule)} className="rounded-lg border p-2">
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </label>
      {error && <p data-testid="form-error" className="text-sm text-red-600">{error}</p>}
      {conflicts.length > 0 && (
        <div data-testid="conflict-list" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
          时间冲突：{conflicts.join('、')}。请调整时间后再保存。
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-indigo-600 py-2 text-white">保存</button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border py-2">取消</button>
      </div>
    </form>
  )
}
