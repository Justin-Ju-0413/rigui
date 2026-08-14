import dayjs from 'dayjs'
import { getSetting } from '../db/settings'
import { computeReportStats, type ReportStats } from '../stats/report'
import type { CalendarEvent, Goal } from '../db/types'

export const REPORT_ENABLED_KEY = 'weekly_report_enabled'
export const REPORT_TIME_KEY = 'weekly_report_time'
export const REPORT_SENT_KEY = 'rigui_weekly_report_sent'
export const DEFAULT_REPORT_TIME = '20:00'

export interface WeeklyReportOpts {
  notify: (title: string, body: string) => void
  /** 注入去重存储（测试用）；默认 localStorage */
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  onError?: (e: unknown) => void
}

export type WeeklyReportResult =
  | { sent: true }
  | { sent: false; reason: 'disabled' | 'not-time' | 'already-sent' | 'empty-week' | 'no-notify' }

function pct(r: number): string {
  return `${Math.round(r * 100)}%`
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}分钟`
  return m === 0 ? `${h}小时` : `${h}小时${m}分`
}

/** 周报摘要正文：完成率 + 时长 + 目标进度(top2) + 下周计划数 */
export function buildSummary(stats: ReportStats): string {
  const parts = [`完成 ${stats.overview.completed}/${stats.overview.total} 项(${pct(stats.overview.completedRate)})`]
  if (stats.overview.totalMinutes > 0) parts.push(`共 ${fmtMinutes(stats.overview.totalMinutes)}`)
  const goals = stats.goalProgress.slice(0, 2)
  if (goals.length > 0) parts.push(`目标:${goals.map(g => `${g.name} ${g.completed}/${g.planned}`).join('、')}`)
  if (stats.nextWeek.plannedCount > 0) parts.push(`下周已排 ${stats.nextWeek.plannedCount} 项`)
  return parts.join(' · ')
}

/**
 * 周报自动推送：仅周日（本周最后一天）到达配置时间后推送一次本周简报。
 * 返回 sent/reason 便于测试与排查。notify 抛错时不记录去重，下个周期重试。
 */
export async function maybeSendWeeklyReport(
  now: Date,
  events: CalendarEvent[],
  goals: Goal[],
  opts: WeeklyReportOpts,
): Promise<WeeklyReportResult> {
  const { notify, onError = console.error } = opts
  const storage = opts.storage ?? localStorage
  try {
    if ((await getSetting(REPORT_ENABLED_KEY)) === '0') return { sent: false, reason: 'disabled' }
    const timeRaw = (await getSetting(REPORT_TIME_KEY)) ?? DEFAULT_REPORT_TIME
    const [h, m] = timeRaw.split(':').map(Number)
    const isSunday = now.getDay() === 0
    const nowMin = now.getHours() * 60 + now.getMinutes()
    if (!isSunday || nowMin < h * 60 + m) return { sent: false, reason: 'not-time' }

    const stats = computeReportStats(events, goals, now)
    const weekKey = dayjs(stats.weekStart).format('YYYY-MM-DD')
    if (storage.getItem(REPORT_SENT_KEY) === weekKey) return { sent: false, reason: 'already-sent' }
    if (stats.overview.total === 0) return { sent: false, reason: 'empty-week' }

    notify('本周简报', buildSummary(stats))
    storage.setItem(REPORT_SENT_KEY, weekKey)
    return { sent: true }
  } catch (e) {
    onError(e)
    return { sent: false, reason: 'no-notify' }
  }
}
