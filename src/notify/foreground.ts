import dayjs from 'dayjs'
import { getAllEvents } from '../db/crud'
import { dueReminders } from './scheduler'

const STORAGE_KEY = 'rigui_notified'
const NOTIFIED_MAX = 500

function loadNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch { return new Set() }
}

function saveNotified(ids: Set<string>): void {
  const arr = [...ids].slice(-NOTIFIED_MAX)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch { /* 忽略配额错误 */ }
}

export interface SchedulerOpts {
  intervalMs?: number
  now?: () => number
  notify?: (title: string, body: string) => void
  onError?: (e: unknown) => void
}

export function startForegroundScheduler(opts: SchedulerOpts = {}): () => void {
  const { intervalMs = 30000, now = Date.now, notify, onError = console.error } = opts
  const defaultNotify = (title: string, body: string) => {
    // Electron：走主进程系统通知（窗口最小化也能收到）；浏览器：Web Notification
    if (window.rigui?.isElectron) {
      window.rigui.notify(title, body)
      return
    }
    if (Notification.permission === 'granted') new Notification(title, { body })
  }
  const tick = async () => {
    try {
      if (!('Notification' in window)) return
      const events = await getAllEvents()
      const notified = loadNotified()
      const due = dueReminders(events, now(), notified)
      if (due.length === 0) return
      for (const d of due) {
        const fn = notify ?? defaultNotify
        try {
          fn(d.event.title, `开始时间 ${dayjs(d.event.startTime).format('HH:mm')}`)
          notified.add(d.id)
        } catch (e) { onError(e) }
      }
      saveNotified(notified)
    } catch (e) { onError(e) }
  }
  void tick()
  const timer = setInterval(() => void tick(), intervalMs)
  return () => clearInterval(timer)
}
