import { useState } from 'react'
import dayjs from 'dayjs'
import { useGoals } from '../hooks/useGoals'
import GoalForm from '../components/GoalForm'
import { scheduleTasks, type ScheduledSlot } from '../planner/schedule'
import { addEvent } from '../db/crud'
import { notifyEventsChanged } from '../events/eventBus'
import type { Goal, GoalTask } from '../db/types'

export default function GoalView() {
  const { goals, events, removeCascade, removeTaskCascade, refresh } = useGoals()
  const [formVisible, setFormVisible] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleteInfo, setDeleteInfo] = useState('')
  const [confirmTask, setConfirmTask] = useState<{ goalId: number; task: GoalTask; count: number } | null>(null)
  const [previewGoalId, setPreviewGoalId] = useState<number | null>(null)
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null)
  const [previewSlots, setPreviewSlots] = useState<ScheduledSlot[]>([])
  const [scheduleError, setScheduleError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [committing, setCommitting] = useState(false)

  const startDelete = async (goal: Goal) => {
    const count = events.filter(e => e.relatedGoalId === goal.id).length
    setDeleteInfo(count > 0 ? `将同时删除 ${count} 条关联事件` : '该目标没有关联事件')
    setConfirmDeleteId(goal.id ?? null)
  }

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return
    await removeCascade(confirmDeleteId)
    setConfirmDeleteId(null)
  }

  const startTaskDelete = (goal: Goal, task: GoalTask) => {
    const count = events.filter(e => e.relatedGoalId === goal.id && e.relatedTaskId === task.id).length
    setConfirmTask({ goalId: goal.id!, task, count })
  }

  const confirmTaskDelete = async () => {
    if (!confirmTask) return
    await removeTaskCascade(confirmTask.goalId, confirmTask.task.id)
    setConfirmTask(null)
  }

  const planTask = async (goal: Goal, task: GoalTask) => {
    setPreviewGoalId(null); setPreviewTaskId(null); setPreviewSlots([]); setScheduleError('')
    const windowStart = dayjs().startOf('day').toDate()
    const windowEnd = dayjs().startOf('day').add(7, 'day').toDate()
    const nowToday = new Date()
    const slots = scheduleTasks(events, goal, task.id, windowStart, windowEnd, nowToday)
    setPreviewGoalId(goal.id ?? null)
    setPreviewTaskId(task.id)
    setPreviewSlots(slots)
    if (slots.length === 0) setScheduleError('本周无空档')
    else if (slots.length < task.weeklyFrequency) setScheduleError(`已排 ${slots.length}/${task.weeklyFrequency} 次（周内无更多空档）`)
  }

  const confirmSchedule = async () => {
    if (previewGoalId === null || previewTaskId === null || committing) return
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
          relatedTaskId: previewTaskId,
        })
        inserted++
      }
      setPreviewGoalId(null)
      setPreviewTaskId(null)
      setPreviewSlots([])
      notifyEventsChanged()
      void refresh()
    } catch {
      const remaining = previewSlots.length - inserted
      if (remaining <= 0) {
        setPreviewGoalId(null)
        setPreviewTaskId(null)
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

  const previewGoal = goals.find(g => g.id === previewGoalId)
  const previewTask = previewGoal?.tasks.find(t => t.id === previewTaskId)

  return (
    <div className="p-4 md:mx-auto md:max-w-2xl md:p-6" data-testid="goal-view">
      <header className="mb-3 flex items-center justify-between pt-2 md:pt-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">目标</h1>
        <button aria-label="新建目标" onClick={() => { setEditing(null); setFormVisible(true) }} data-testid="goal-new-btn"
          className="btn btn-primary">+ 新建目标</button>
      </header>

      {formVisible && (
        <div className="card mb-3 rounded-lg">
          <GoalForm initial={editing ?? undefined}
            onSaved={() => { setFormVisible(false); void refresh() }}
            onCancel={() => setFormVisible(false)} />
        </div>
      )}

      {confirmDeleteId !== null && (() => {
        const goal = goals.find(g => g.id === confirmDeleteId)
        if (!goal) return null
        return (
          <div data-testid="goal-delete-confirm" className="card mb-3 rounded-lg p-4 text-sm">
            <p className="font-medium">{deleteInfo}，确认删除「{goal.name}」？</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">此操作不可撤销。</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => { void confirmDelete() }} className="btn btn-danger flex-1">确认删除</button>
              <button onClick={() => setConfirmDeleteId(null)} className="btn flex-1">取消</button>
            </div>
          </div>
        )
      })()}

      {confirmTask !== null && (
        <div data-testid="task-delete-confirm" className="card mb-3 rounded-lg p-4 text-sm">
          <p className="font-medium">
            {confirmTask.count > 0 ? `将同时删除 ${confirmTask.count} 条关联事件，` : ''}确认删除任务「{confirmTask.task.name}」？
          </p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">此操作不可撤销。</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { void confirmTaskDelete() }} className="btn btn-danger flex-1">确认删除任务</button>
            <button onClick={() => setConfirmTask(null)} className="btn flex-1">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {goals.map(goal => {
          const weekStart = dayjs().startOf('week').add(1, 'day')
          const weekEnd = weekStart.add(7, 'day')
          return (
            <section key={goal.id} data-testid={`goal-card-${goal.id}`} className="card rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold">{goal.name}</h2>
                  {goal.endDate && <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">截止 {dayjs(goal.endDate).format('YYYY-MM-DD')}</p>}
                </div>
                <button aria-label="编辑" onClick={() => { setEditing(goal); setFormVisible(true) }} className="btn text-xs">编辑</button>
              </div>

              <div className="mt-2 space-y-1.5">
                {goal.tasks.map(task => {
                  const weekCount = events.filter(e =>
                    e.relatedGoalId === goal.id && e.relatedTaskId === task.id
                    && dayjs(e.startTime).isAfter(weekStart) && dayjs(e.startTime).isBefore(weekEnd)
                  ).length
                  return (
                    <div key={task.id} data-testid={`task-row-${task.id}`} className="rounded-lg bg-[var(--bg-sidebar)] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{task.name}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                            每周 <span data-testid={`task-freq-${task.id}`}>{task.weeklyFrequency}</span> 次
                            <span className="mx-1.5">·</span>
                            <span data-testid={`task-duration-${task.id}`}>{task.durationMinutes}</span> 分钟
                          </p>
                          <p className="mt-0.5 text-xs" data-testid={`task-week-progress-${task.id}`}>
                            本周 <span className="font-semibold text-[var(--accent)]">{weekCount}</span>/{task.weeklyFrequency} 已排
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button onClick={() => { void planTask(goal, task) }} disabled={previewGoalId !== null}
                            data-testid="task-schedule-btn" className="btn btn-primary px-3 py-1 text-xs">排期一周</button>
                          <button aria-label={`删除任务 ${task.name}`} onClick={() => startTaskDelete(goal, task)}
                            data-testid="task-delete-btn" className="btn px-2.5 py-1 text-xs">删除</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3">
                <button aria-label="删除目标" onClick={() => { setFormVisible(false); void startDelete(goal) }} className="btn w-full text-xs">
                  删除目标
                </button>
              </div>
            </section>
          )
        })}

        {previewGoalId !== null && previewSlots.length > 0 && (
          <div data-testid="schedule-preview" className="card rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[var(--accent)]">
              <span data-testid="schedule-success">
                已排 {previewSlots.length}/{previewTask?.weeklyFrequency ?? 0} 次 · {previewTask?.name ?? ''}
              </span>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {previewSlots.map(s => (
                <li key={s.startTime} data-testid="schedule-item"
                  className="flex items-center justify-between rounded-lg bg-[var(--bg-sidebar)] px-3 py-2 text-sm">
                  <span>{fmt(s.startTime)} {s.title}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{dayjs(s.endTime).diff(s.startTime, 'minute')} 分钟</span>
                </li>
              ))}
            </ul>
            {confirmError && <p data-testid="schedule-confirm-error" className="text-sm" style={{ color: 'var(--danger)' }}>{confirmError}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { void confirmSchedule() }} disabled={committing}
                className="btn btn-primary flex-1">全部确认</button>
              <button onClick={() => { setPreviewGoalId(null); setPreviewTaskId(null) }} disabled={committing} className="btn flex-1">放弃</button>
            </div>
          </div>
        )}
        {previewGoalId !== null && previewSlots.length === 0 && (
          <div data-testid="schedule-empty" className="card rounded-lg p-4 text-sm text-[var(--text-secondary)]">
            <span data-testid="schedule-error">{scheduleError || '本周无空档'}</span>
          </div>
        )}
        {goals.length === 0 && !formVisible && (
          <div className="card rounded-lg p-6 text-center text-sm text-[var(--text-secondary)]">
            还没有目标。点击「新建目标」添加一个，拆解为任务后点「排期一周」自动安排到空闲时段。
          </div>
        )}
      </div>
    </div>
  )
}
