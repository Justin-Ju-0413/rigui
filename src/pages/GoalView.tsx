import { useState } from 'react'
import dayjs from 'dayjs'
import { useGoals } from '../hooks/useGoals'
import GoalForm from '../components/GoalForm'
import { scheduleTasks, type ScheduledSlot } from '../planner/schedule'
import { addEvent } from '../db/crud'
import { notifyEventsChanged } from '../events/eventBus'
import type { Goal } from '../db/types'

export default function GoalView() {
  const { goals, events, removeCascade, refresh } = useGoals()
  const [formVisible, setFormVisible] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleteInfo, setDeleteInfo] = useState('')
  const [previewGoalId, setPreviewGoalId] = useState<number | null>(null)
  const [previewSlots, setPreviewSlots] = useState<ScheduledSlot[]>([])
  const [scheduleError, setScheduleError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [committing, setCommitting] = useState(false)

  const startDelete = async (goal: Goal) => {
    const count = events.filter(e => e.relatedGoalId === goal.id).length
    setDeleteInfo(count > 0 ? `将同时删除 ${count} 条关联任务` : '该目标没有关联任务')
    setConfirmDeleteId(goal.id ?? null)
  }

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return
    await removeCascade(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const planWeek = async (goal: Goal) => {
    setPreviewGoalId(null); setPreviewSlots([]); setScheduleError('')
    const windowStart = dayjs().startOf('day').toDate()
    const windowEnd = dayjs().startOf('day').add(7, 'day').toDate()
    const nowToday = new Date()
    const slots = scheduleTasks(events, goal, windowStart, windowEnd, nowToday)
    setPreviewGoalId(goal.id ?? null)
    setPreviewSlots(slots)
    if (slots.length === 0) setScheduleError('本周无空档')
    else if (slots.length < (goal.weeklyFrequency ?? 1)) setScheduleError(`已排 ${slots.length}/${goal.weeklyFrequency ?? 1} 次（周内无更多空档）`)
  }

  const confirmSchedule = async () => {
    if (previewGoalId === null || committing) return
    setCommitting(true)
    setConfirmError('')
    let inserted = 0
    try {
      for (const s of previewSlots) {
        await addEvent({
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          allDay: false,
          reminderOffsets: [],
          repeat: 'none',
          relatedGoalId: previewGoalId,
        })
        inserted++
      }
      setPreviewGoalId(null)
      setPreviewSlots([])
      notifyEventsChanged()
      void refresh()
    } catch {
      const remaining = previewSlots.length - inserted
      if (remaining <= 0) {
        setPreviewGoalId(null)
        setPreviewSlots([])
      } else {
        setPreviewSlots(previewSlots.slice(inserted))
      }
      setConfirmError(`入库失败：已成功 ${inserted} 条，剩余 ${Math.max(remaining, 0)} 条未入库，可重试。`)
    } finally {
      setCommitting(false)
    }
  }

  const WEEKDAYS = '日一二三四五六'
  const fmt = (t: string) => `${WEEKDAYS[dayjs(t).day()]} ${dayjs(t).format('MM-DD HH:mm')}`

  return (
    <div className="p-4 md:mx-auto md:max-w-2xl md:p-6" data-testid="goal-view">
      <header className="mb-3 flex items-center justify-between pt-2 md:pt-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">目标</h1>
        <button aria-label="新建目标" onClick={() => { setEditing(null); setFormVisible(true) }} data-testid="goal-new-btn"
          className="glass-btn glass-btn-primary">+ 新建目标</button>
      </header>

      {formVisible && (
        <div className="glass mb-3 rounded-3xl">
          <GoalForm initial={editing ?? undefined}
            onSaved={() => { setFormVisible(false); void refresh() }}
            onCancel={() => setFormVisible(false)} />
        </div>
      )}

      {confirmDeleteId !== null && (() => {
        const goal = goals.find(g => g.id === confirmDeleteId)
        if (!goal) return null
        return (
          <div data-testid="goal-delete-confirm" className="glass mb-3 rounded-3xl p-4 text-sm">
            <p className="font-medium">{deleteInfo}，确认删除「{goal.name}」？</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">此操作不可撤销。</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { void confirmDelete() }} className="glass-btn glass-btn-danger flex-1">确认删除</button>
              <button onClick={() => setConfirmDeleteId(null)} className="glass-btn flex-1">取消</button>
            </div>
          </div>
        )
      })()}

      <div className="space-y-2.5">
        {goals.map(goal => {
          const freq = goal.weeklyFrequency ?? 1
          const weekStart = dayjs().startOf('week').add(1, 'day')
          const weekEnd = weekStart.add(7, 'day')
          const weekCount = events.filter(e =>
            e.relatedGoalId === goal.id && dayjs(e.startTime).isAfter(weekStart) && dayjs(e.startTime).isBefore(weekEnd)
          ).length
          return (
            <section key={goal.id} data-testid={`goal-card-${goal.id}`} className="glass rounded-3xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold">{goal.name}</h2>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    <span data-testid="goal-frequency">每周 {freq} 次</span>
                    <span className="mx-1.5">·</span>
                    <span data-testid="goal-duration">{goal.durationMinutes ?? 60} 分钟</span>
                  </p>
                  {goal.endDate && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">截止 {dayjs(goal.endDate).format('YYYY-MM-DD')}</p>}
                </div>
                <button aria-label="编辑" onClick={() => { setEditing(goal); setFormVisible(true) }} className="glass-btn text-xs">编辑</button>
              </div>
              <p className="mt-2 text-xs" data-testid="goal-week-progress">
                本周 <span className="font-semibold text-[var(--accent)]">{weekCount}</span>/{freq} 已排
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { void planWeek(goal) }} disabled={previewGoalId !== null}
                  data-testid="goal-schedule-btn" className="glass-btn glass-btn-primary flex-1">排期一周</button>
                <button aria-label="删除" onClick={() => { setFormVisible(false); void startDelete(goal) }} className="glass-btn flex-1">删除</button>
              </div>
            </section>
          )
        })}
        {previewGoalId !== null && previewSlots.length > 0 && (
          <div data-testid="schedule-preview" className="glass-strong rounded-3xl p-4">
            <h3 className="text-sm font-semibold text-[var(--accent)]">
              <span data-testid="schedule-success">已排 {previewSlots.length}/{goals.find(g => g.id === previewGoalId)?.weeklyFrequency ?? 1} 次</span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {previewSlots.map(s => (
                <li key={s.startTime} data-testid="schedule-item"
                  className="flex items-center justify-between rounded-2xl bg-white/40 px-3 py-2 text-sm dark:bg-white/5">
                  <span>{fmt(s.startTime)} {s.title}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{dayjs(s.endTime).diff(s.startTime, 'minute')} 分钟</span>
                </li>
              ))}
            </ul>
            {confirmError && <p data-testid="schedule-confirm-error" className="text-sm" style={{ color: 'var(--danger)' }}>{confirmError}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { void confirmSchedule() }} disabled={committing}
                className="glass-btn glass-btn-primary flex-1">全部确认</button>
              <button onClick={() => setPreviewGoalId(null)} disabled={committing} className="glass-btn flex-1">放弃</button>
            </div>
          </div>
        )}
        {previewGoalId !== null && previewSlots.length === 0 && (
          <div data-testid="schedule-empty" className="glass rounded-3xl p-4 text-sm text-[var(--text-secondary)]">
            <span data-testid="schedule-error">{scheduleError || '本周无空档'}</span>
          </div>
        )}
        {goals.length === 0 && !formVisible && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-[var(--text-secondary)]">
            还没有目标。点击「新建目标」添加一个，然后点「排期一周」自动安排到空闲时段。
          </div>
        )}
      </div>
    </div>
  )
}
