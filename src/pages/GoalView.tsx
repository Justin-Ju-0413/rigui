import { useState } from 'react'
import dayjs from 'dayjs'
import { useGoals } from '../hooks/useGoals'
import GoalForm from '../components/GoalForm'
import type { Goal } from '../db/types'

export default function GoalView() {
  const { goals, events, removeCascade, refresh } = useGoals()
  const [formVisible, setFormVisible] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleteInfo, setDeleteInfo] = useState('')

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
                <button data-testid="goal-schedule-btn" className="glass-btn glass-btn-primary flex-1">排期一周</button>
                <button aria-label="删除" onClick={() => { setFormVisible(false); void startDelete(goal) }} className="glass-btn flex-1">删除</button>
              </div>
            </section>
          )
        })}
        {goals.length === 0 && !formVisible && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-[var(--text-secondary)]">
            还没有目标。点击「新建目标」添加一个，然后点「排期一周」自动安排到空闲时段。
          </div>
        )}
      </div>
    </div>
  )
}
