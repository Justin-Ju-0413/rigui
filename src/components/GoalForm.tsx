import { useState } from 'react'
import dayjs from 'dayjs'
import type { Goal, GoalTask } from '../db/types'
import { useGoals } from '../hooks/useGoals'
import { normalizeGoal } from '../db/crud'

interface Props {
  initial?: Goal
  onSaved: (id: number) => void
  onCancel: () => void
}

let taskSeq = 0
const newTaskId = () => 't-' + Date.now() + '-' + (++taskSeq)

const emptyTask = (): GoalTask => ({ id: newTaskId(), name: '', weeklyFrequency: 1, durationMinutes: 60 })

export default function GoalForm({ initial, onSaved, onCancel }: Props) {
  const { save, update } = useGoals()
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? dayjs().format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [tasks, setTasks] = useState<GoalTask[]>(() => {
    const base = initial ? normalizeGoal(initial) : null
    return (base?.tasks ?? []).length > 0 ? base!.tasks.map(t => ({ ...t })) : [emptyTask()]
  })
  const [error, setError] = useState('')

  const setTask = (index: number, patch: Partial<GoalTask>) => {
    setTasks(list => list.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }

  const removeTask = (index: number) => {
    setTasks(list => list.filter((_, i) => i !== index))
  }

  const submit = async () => {
    if (!name.trim()) { setError('请输入目标名称'); return }
    if (tasks.length === 0) { setError('至少需要一个任务'); return }
    if (tasks.some(t => !t.name.trim())) { setError('任务名不能为空'); return }
    if (tasks.some(t => t.weeklyFrequency < 1)) { setError('每周次数至少 1 次'); return }
    if (tasks.some(t => t.durationMinutes < 1)) { setError('单次时长不能为 0'); return }
    setError('')
    const input = {
      name: name.trim(),
      startDate,
      ...(endDate ? { endDate } : {}),
      tasks: tasks.map(t => ({ ...t, name: t.name.trim() })),
    }
    if (initial?.id) {
      await update(initial.id, input)
      onSaved(initial.id)
    } else {
      const id = await save(input)
      onSaved(id)
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void submit() }} className="space-y-3 p-4" data-testid="goal-form">
      <label className="block text-xs font-medium text-[var(--text-secondary)]">目标名称
        <input aria-label="目标名称" value={name} onChange={e => setName(e.target.value)} placeholder="如：学英语" className="input mt-1" />
      </label>
      <div className="flex gap-2">
        <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">开始日期
          <input type="date" aria-label="开始日期" value={startDate} onChange={e => setStartDate(e.target.value)} className="input mt-1" />
        </label>
        <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">截止日期（选填）
          <input type="date" aria-label="截止日期" value={endDate} onChange={e => setEndDate(e.target.value)} className="input mt-1" />
        </label>
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)]">任务拆解（每个任务独立排期与完成）</p>
        <div className="mt-1.5 space-y-1.5">
          {tasks.map((t, i) => (
            <div key={t.id} className="rounded-lg bg-[var(--bg-sidebar)] p-2" data-testid={'task-row-' + (i + 1)}>
              <div className="flex gap-1.5">
                <input aria-label={'任务名 ' + (i + 1)} value={t.name} onChange={e => setTask(i, { name: e.target.value })}
                  placeholder={'任务 ' + (i + 1)} className="input flex-1" />
                <button type="button" aria-label={'删除任务 ' + (i + 1)} onClick={() => removeTask(i)}
                  className="btn shrink-0 px-2 text-xs">删除</button>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <label className="flex-1 text-[11px] text-[var(--text-tertiary)]">每周次数
                  <input type="number" min={1} aria-label={'每周次数 ' + (i + 1)} value={t.weeklyFrequency}
                    onChange={e => setTask(i, { weeklyFrequency: Number(e.target.value) })} className="input mt-0.5" />
                </label>
                <label className="flex-1 text-[11px] text-[var(--text-tertiary)]">单次时长（分钟）
                  <input type="number" min={1} aria-label={'单次时长 ' + (i + 1)} value={t.durationMinutes}
                    onChange={e => setTask(i, { durationMinutes: Number(e.target.value) })} className="input mt-0.5" />
                </label>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setTasks(list => [...list, emptyTask()])} aria-label="添加任务"
          className="btn mt-1.5 w-full text-xs">+ 添加任务</button>
      </div>

      {error && <p data-testid="goal-form-error" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">保存</button>
        <button type="button" onClick={onCancel} className="btn flex-1">取消</button>
      </div>
    </form>
  )
}
