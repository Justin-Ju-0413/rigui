import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { ChatAction } from '../../ai/chatTypes'
import type { ParsedEventInput } from '../../ai/schema'
import { findConflicts } from '../../planner/conflicts'
import { scheduleTasks, type ScheduledSlot } from '../../planner/schedule'
import { getAllEvents, getAllGoals } from '../../db/crud'
import type { CalendarEvent, Goal } from '../../db/types'
import EventPreviewCard from '../EventPreviewCard'

interface Props {
  action: ChatAction
  onConfirm: (action: ChatAction) => void
  onCancel: () => void
}

/** 写类动作确认卡:create 复用 EventPreviewCard,其余为摘要确认 */
export default function ActionCard({ action, onConfirm, onCancel }: Props) {
  if (action.type === 'create_event') {
    return <CreateCard action={action} onConfirm={onConfirm} onCancel={onCancel} />
  }
  if (action.type === 'delete_event') return <DeleteCard action={action} onConfirm={onConfirm} onCancel={onCancel} />
  if (action.type === 'update_event') return <UpdateCard action={action} onConfirm={onConfirm} onCancel={onCancel} />
  if (action.type === 'schedule_week') return <ScheduleCard action={action} onConfirm={onConfirm} onCancel={onCancel} />
  return (
    <div data-testid="action-card" className="card space-y-2.5 rounded-lg p-3.5">
      <h3 className="text-sm font-semibold text-[var(--accent)]">本周小结</h3>
      <p className="text-sm text-[var(--text-secondary)]">生成本周完成率、目标进度与时间分布小结。</p>
      <div className="flex gap-2">
        <button data-testid="action-confirm" onClick={() => onConfirm(action)} className="btn btn-primary flex-1">生成</button>
        <button onClick={onCancel} className="btn flex-1">取消</button>
      </div>
    </div>
  )
}

function CreateCard({ action, onConfirm, onCancel }: Props) {
  const [parsed, setParsed] = useState<ParsedEventInput>(action.payload)
  const [conflicts, setConflicts] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const full: CalendarEvent = {
        ...parsed,
        id: undefined,
        completed: false,
        createdAt: '',
        startTime: parsed.startTime,
        endTime: parsed.endTime ?? dayjs(parsed.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
        allDay: parsed.allDay ?? false,
        reminderOffsets: parsed.reminderOffsets ?? [],
        repeat: parsed.repeat ?? 'none',
      }
      const found = findConflicts(await getAllEvents(), full, '2000-01-01T00:00:00', '2100-12-31T23:59:59')
      if (!cancelled) setConflicts(found.map(e => `${e.title}（${dayjs(e.startTime).format('MM-DD HH:mm')}）`))
    }
    void refresh()
    return () => { cancelled = true }
  }, [parsed])

  return (
    <EventPreviewCard
      parsed={parsed}
      conflicts={conflicts}
      onConfirm={() => onConfirm({ ...action, payload: parsed })}
      onEdit={setParsed}
      onCancel={onCancel} />
  )
}

function useEventById(id: number): CalendarEvent | null {
  const [ev, setEv] = useState<CalendarEvent | null>(null)
  useEffect(() => {
    let cancelled = false
    void getAllEvents().then(all => { if (!cancelled) setEv(all.find(e => e.id === id) ?? null) })
    return () => { cancelled = true }
  }, [id])
  return ev
}

function DeleteCard({ action, onConfirm, onCancel }: Props) {
  const ev = useEventById(action.payload.id)
  return (
    <div data-testid="action-card" className="card space-y-2.5 rounded-lg p-3.5">
      <h3 className="text-sm font-semibold text-[var(--accent)]">确认删除</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        {ev ? `将删除：${ev.title}（${dayjs(ev.startTime).format('M月D日 HH:mm')}）` : '日程不存在或已删除'}
      </p>
      <div className="flex gap-2">
        <button data-testid="action-confirm" disabled={!ev} onClick={() => onConfirm(action)} className="btn btn-danger flex-1">确认删除</button>
        <button onClick={onCancel} className="btn flex-1">取消</button>
      </div>
    </div>
  )
}

function UpdateCard({ action, onConfirm, onCancel }: Props) {
  const ev = useEventById(action.payload.id)
  const patches = Object.entries(action.payload.patch).map(([k, v]) => `${k}: ${String(v)}`)
  return (
    <div data-testid="action-card" className="card space-y-2.5 rounded-lg p-3.5">
      <h3 className="text-sm font-semibold text-[var(--accent)]">确认修改</h3>
      <p className="text-sm text-[var(--text-secondary)]">{ev ? `修改：${ev.title}` : '日程不存在或已删除'}</p>
      <ul className="space-y-0.5 text-xs text-[var(--text-secondary)]">
        {patches.map(p => <li key={p}>↳ {p}</li>)}
      </ul>
      <div className="flex gap-2">
        <button data-testid="action-confirm" disabled={!ev} onClick={() => onConfirm(action)} className="btn btn-primary flex-1">确认修改</button>
        <button onClick={onCancel} className="btn flex-1">取消</button>
      </div>
    </div>
  )
}

function ScheduleCard({ action, onConfirm, onCancel }: Props) {
  const [preview, setPreview] = useState<{ goals: Goal[]; slots: ScheduledSlot[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const calc = async () => {
      const events = await getAllEvents()
      const all = await getAllGoals()
      const goals = action.payload?.goalId ? all.filter(g => g.id === action.payload?.goalId) : all
      const windowStart = dayjs().startOf('day').toDate()
      const windowEnd = dayjs().startOf('day').add(7, 'day').toDate()
      const slots: ScheduledSlot[] = []
      for (const goal of goals) {
        if (goal.id == null) continue
        for (const task of goal.tasks ?? []) {
          slots.push(...scheduleTasks(events, goal, task.id, windowStart, windowEnd, new Date()))
        }
      }
      if (!cancelled) { setPreview({ goals, slots }); setLoading(false) }
    }
    void calc()
    return () => { cancelled = true }
  }, [action])

  return (
    <div data-testid="action-card" className="card space-y-2.5 rounded-lg p-3.5">
      <h3 className="text-sm font-semibold text-[var(--accent)]">目标排期</h3>
      <p className="text-sm text-[var(--text-secondary)]">
        {loading ? '计算可排时段…'
          : preview!.slots.length > 0
            ? `将为 ${preview!.goals.length} 个目标排入 ${preview!.slots.length} 个时段（未来一周工作日）`
            : '未来一周无空档可排'}
      </p>
      <div className="flex gap-2">
        <button data-testid="action-confirm" disabled={loading || !preview || preview.slots.length === 0}
          onClick={() => onConfirm(action)} className="btn btn-primary flex-1">确认排期</button>
        <button onClick={onCancel} className="btn flex-1">取消</button>
      </div>
    </div>
  )
}
