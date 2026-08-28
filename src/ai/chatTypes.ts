import type { ParsedEventInput } from './schema'

export type QueryRange = 'today' | 'week' | 'month' | 'all'

/** 对话动作协议：查询类自动执行回填，写类由用户确认后执行 */
export type ChatAction =
  | { type: 'query_events'; payload: { range: QueryRange } }
  | { type: 'query_goals'; payload?: unknown }
  | { type: 'create_event'; payload: ParsedEventInput }
  | { type: 'update_event'; payload: { id: number; patch: Partial<ParsedEventInput> } }
  | { type: 'delete_event'; payload: { id: number } }
  | { type: 'schedule_week'; payload?: { goalId?: number } }
  | { type: 'weekly_report'; payload?: unknown }

export interface ChatReply {
  reply: string
  actions?: ChatAction[]
}
