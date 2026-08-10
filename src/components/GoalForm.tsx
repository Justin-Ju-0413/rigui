import { useState } from 'react'
import dayjs from 'dayjs'
import type { Goal } from '../db/types'
import { useGoals } from '../hooks/useGoals'

interface Props {
  initial?: Goal
  onSaved: (id: number) => void
  onCancel: () => void
}

export default function GoalForm({ initial, onSaved, onCancel }: Props) {
  const { save, update } = useGoals()
  const [name, setName] = useState(initial?.name ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? dayjs().format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(initial?.endDate ?? '')
  const [weeklyFrequency, setWeeklyFrequency] = useState(initial?.weeklyFrequency ?? 1)
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 60)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim()) { setError('请输入目标名称'); return }
    if (weeklyFrequency < 1) { setError('每周次数至少 1 次'); return }
    if (durationMinutes < 1) { setError('单次时长不能为 0'); return }
    setError('')
    const input = {
      name: name.trim(),
      startDate,
      ...(endDate ? { endDate } : {}),
      weeklyFrequency: Number(weeklyFrequency),
      durationMinutes: Number(durationMinutes),
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
        <input aria-label="目标名称" value={name} onChange={e => setName(e.target.value)} placeholder="如：学英语" className="glass-input mt-1" />
      </label>
      <div className="flex gap-2">
        <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">开始日期
          <input type="date" aria-label="开始日期" value={startDate} onChange={e => setStartDate(e.target.value)} className="glass-input mt-1" />
        </label>
        <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">截止日期（选填）
          <input type="date" aria-label="截止日期" value={endDate} onChange={e => setEndDate(e.target.value)} className="glass-input mt-1" />
        </label>
      </div>
      <div className="flex gap-2">
        <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">每周次数
          <input type="number" min={1} aria-label="每周次数" value={weeklyFrequency} onChange={e => setWeeklyFrequency(Number(e.target.value))} className="glass-input mt-1" />
        </label>
        <label className="flex-1 text-xs font-medium text-[var(--text-secondary)]">单次时长（分钟）
          <input type="number" min={1} aria-label="单次时长" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className="glass-input mt-1" />
        </label>
      </div>
      {error && <p data-testid="goal-form-error" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="glass-btn glass-btn-primary flex-1">保存</button>
        <button type="button" onClick={onCancel} className="glass-btn flex-1">取消</button>
      </div>
    </form>
  )
}
