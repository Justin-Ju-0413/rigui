import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGoals } from '../hooks/useGoals'
import { useLLMConfig } from '../context/LLMContext'
import { computeReportStats } from '../stats/report'
import { generateWeeklyReport } from '../ai/weeklyReport'

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}分钟`
  return m === 0 ? `${h}小时` : `${h}小时${m}分`
}

const pct = (r: number) => `${Math.round(r * 100)}%`

export default function WeeklyReportCard() {
  const { goals, events } = useGoals()
  const { config } = useLLMConfig()
  const [anchor, setAnchor] = useState(() => dayjs())
  const [aiText, setAiText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const stats = useMemo(() => computeReportStats(events, goals, anchor), [events, goals, anchor])
  const weekLabel = `${dayjs(stats.weekStart).format('M月D日')} ~ ${dayjs(stats.weekEnd).format('M月D日')}`
  const empty = stats.overview.total === 0

  const maxDayMinutes = Math.max(...stats.timeDistribution.map(d => d.minutes), 1)

  const handleAnalyze = async () => {
    if (!config) { setError('请先在设置页配置 LLM'); return }
    setLoading(true)
    setError('')
    setAiText('')
    const result = await generateWeeklyReport(config, stats, weekLabel)
    setLoading(false)
    if (result.ok) setAiText(result.content)
    else setError(`AI 分析失败：${result.errors.join('；')}`)
  }

  return (
    <section data-testid="weekly-report" className="card mb-3 p-3.5 md:p-4">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">本周简报</h2>
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <button aria-label="上一周" onClick={() => setAnchor(a => a.subtract(1, 'week'))}
            className="btn flex h-6 w-6 items-center justify-center rounded-full p-0 text-sm leading-none">‹</button>
          <span className="min-w-24 text-center tabular-nums" data-testid="weekly-report-range">{weekLabel}</span>
          <button aria-label="下一周" onClick={() => setAnchor(a => a.add(1, 'week'))}
            className="btn flex h-6 w-6 items-center justify-center rounded-full p-0 text-sm leading-none">›</button>
        </div>
      </header>

      {empty ? (
        <p data-testid="weekly-report-empty" className="mt-2 text-sm text-[var(--text-tertiary)]">本周暂无日程</p>
      ) : (
        <div className="mt-2 space-y-2 text-sm">
          <p data-testid="weekly-report-overview" className="text-[var(--text-secondary)]">
            共 <span className="font-semibold text-[var(--text-primary)]">{stats.overview.total}</span> 项 · 完成{' '}
            <span className="font-semibold text-[var(--ok)]">{stats.overview.completed}</span>（{pct(stats.overview.completedRate)}）· 共{' '}
            {fmtMinutes(stats.overview.totalMinutes)}
          </p>

          {stats.goalProgress.length > 0 && (
            <div className="space-y-0.5">
              {stats.goalProgress.map(g => (
                <p key={g.name} className="text-xs text-[var(--text-secondary)]">
                  {g.name}：完成 <span className="font-semibold text-[var(--accent)]">{g.completed}/{g.planned}</span>（{pct(g.completedRate)}）
                </p>
              ))}
            </div>
          )}

          <div className="flex items-end gap-1" aria-label="每日时长分布">
            {stats.timeDistribution.map(d => (
              <div key={d.day} className="flex-1 text-center" title={`周${'一二三四五六日'[d.day]} ${d.minutes} 分钟`}>
                <div className="mx-auto w-2 rounded-sm bg-[var(--accent-soft)]"
                  style={{ height: `${Math.max(Math.round((d.minutes / maxDayMinutes) * 32), d.minutes > 0 ? 4 : 2)}px`, background: d.minutes > 0 ? 'var(--accent)' : 'var(--border)' }} />
                <div className="text-[10px] text-[var(--text-tertiary)]">{'一二三四五六日'[d.day]}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            空闲：工作日约 {fmtMinutes(stats.freeSlots.totalMinutes)}，最长连续 {fmtMinutes(stats.freeSlots.longestMinutes)}
          </p>

          {stats.conflicts.length > 0 && (
            <p data-testid="report-conflicts" className="text-xs" style={{ color: 'var(--warn-fg)' }}>
              {stats.conflicts.length} 处冲突：{stats.conflicts.slice(0, 3).map(c => `${c.title} × ${c.other}`).join('、')}
              {stats.conflicts.length > 3 ? ` 等 ${stats.conflicts.length} 处` : ''}
            </p>
          )}
        </div>
      )}

      <div className="mt-2.5 border-t border-[var(--border)] pt-2.5">
        {error && <p data-testid="weekly-report-error" className="mb-1.5 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
        {aiText && (
          <p data-testid="weekly-report-ai-text" className="mb-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-secondary)]">{aiText}</p>
        )}
        <button onClick={() => void handleAnalyze()} disabled={loading || empty} data-testid="weekly-report-ai"
          className="btn btn-primary w-full text-xs">
          {loading ? '分析中…' : 'AI 分析'}
        </button>
      </div>
    </section>
  )
}
