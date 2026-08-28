import dayjs from 'dayjs'
import { addEvent, deleteEvent, getAllEvents, getAllGoals, updateEvent } from '../db/crud'
import { scheduleTasks } from '../planner/schedule'
import { validateParsedEvent } from './schema'
import { notifyEventsChanged } from '../events/eventBus'
import type { ChatAction } from './chatTypes'

export type ExecuteResult = { ok: true; message: string } | { ok: false; message: string }

/** 执行写类动作(经用户确认后调用);查询类动作不在此处理 */
export async function executeAction(action: ChatAction): Promise<ExecuteResult> {
  switch (action.type) {
    case 'create_event': {
      const check = validateParsedEvent(action.payload)
      if (!check.ok) return { ok: false, message: `日程信息有误：${check.errors.join('；')}` }
      const d = check.data
      await addEvent({
        title: d.title,
        startTime: d.startTime,
        endTime: d.endTime ?? dayjs(d.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
        allDay: d.allDay ?? false,
        location: d.location,
        reminderOffsets: d.reminderOffsets ?? [],
        repeat: d.repeat ?? 'none',
      })
      notifyEventsChanged()
      return { ok: true, message: `已创建「${d.title}」` }
    }
    case 'update_event': {
      const exists = (await getAllEvents()).find(e => e.id === action.payload.id)
      if (!exists) return { ok: false, message: '日程不存在或已被删除' }
      await updateEvent(action.payload.id, action.payload.patch)
      notifyEventsChanged()
      return { ok: true, message: `已更新「${exists.title}」` }
    }
    case 'delete_event': {
      const exists = (await getAllEvents()).find(e => e.id === action.payload.id)
      if (!exists) return { ok: false, message: '日程不存在或已被删除' }
      await deleteEvent(action.payload.id)
      notifyEventsChanged()
      return { ok: true, message: `已删除「${exists.title}」` }
    }
    case 'schedule_week': {
      const events = await getAllEvents()
      const allGoals = await getAllGoals()
      const goals = action.payload?.goalId
        ? allGoals.filter(g => g.id === action.payload?.goalId)
        : allGoals
      const windowStart = dayjs().startOf('day').toDate()
      const windowEnd = dayjs().startOf('day').add(7, 'day').toDate()
      let inserted = 0
      for (const goal of goals) {
        if (goal.id == null) continue
        for (const task of goal.tasks ?? []) {
          const slots = scheduleTasks(events, goal, task.id, windowStart, windowEnd, new Date())
          for (const s of slots) {
            await addEvent({
              title: s.title,
              startTime: s.startTime,
              endTime: s.endTime,
              allDay: false,
              reminderOffsets: [],
              repeat: 'none',
              relatedGoalId: goal.id,
              relatedTaskId: task.id,
            })
            inserted++
          }
        }
      }
      notifyEventsChanged()
      return { ok: true, message: `已为 ${goals.length} 个目标排入 ${inserted} 个时段` }
    }
    case 'weekly_report': {
      const { computeReportStats } = await import('../stats/report')
      const stats = computeReportStats(await getAllEvents(), await getAllGoals(), dayjs())
      const { overview, goalProgress } = stats
      const goalLine = goalProgress.length
        ? goalProgress.map(g => `${g.name} ${g.completed}/${g.planned}`).join('、')
        : '无目标'
      return {
        ok: true,
        message: `本周完成 ${overview.completed}/${overview.total} 项，共 ${overview.totalMinutes} 分钟；目标进度：${goalLine}；冲突 ${stats.conflicts.length} 处；下周计划 ${stats.nextWeek.plannedCount} 项。`,
      }
    }
    case 'query_events':
    case 'query_goals':
      return { ok: false, message: '查询动作无需确认' }
  }
}
