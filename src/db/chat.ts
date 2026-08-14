import { db } from './schema'

/** 对话消息:user 原文 / assistant 的 reply + 原始动作 JSON(渲染确认卡用) */
export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  actionsJson?: string
  createdAt: string
}

/** 按时间升序取最近 limit 条(默认 200,超出历史截断) */
export async function listMessages(limit = 200): Promise<ChatMessage[]> {
  const all = await db.chatMessages.orderBy('createdAt').toArray()
  return all.slice(-limit)
}

export async function addMessage(msg: Omit<ChatMessage, 'id'>): Promise<number> {
  return db.chatMessages.add(msg)
}

export async function clearMessages(): Promise<void> {
  await db.chatMessages.clear()
}
