import { describe, expect, it, beforeEach } from 'vitest'
import { addMessage, clearMessages, listMessages } from './chat'
import { db } from './schema'

const base = (): Omit<import('./chat').ChatMessage, 'id'> => ({
  role: 'user',
  content: '明天下午开会',
  createdAt: '2026-08-15T10:00:00',
})

describe('chat_messages', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('addMessage 写入并 round-trip(含 actionsJson)', async () => {
    const id = await addMessage(base())
    const id2 = await addMessage({
      role: 'assistant',
      content: '已安排',
      actionsJson: JSON.stringify([{ type: 'create_event' }]),
      createdAt: '2026-08-15T10:00:01',
    })
    const all = await listMessages()
    expect(all).toHaveLength(2)
    expect(all[0].id).toBe(id)
    expect(all[1].id).toBe(id2)
    expect(all[1].actionsJson).toContain('create_event')
  })

  it('按 createdAt 升序返回', async () => {
    await addMessage({ ...base(), content: '第二条', createdAt: '2026-08-15T11:00:00' })
    await addMessage({ ...base(), content: '第一条', createdAt: '2026-08-15T09:00:00' })
    await addMessage({ ...base(), content: '第三条', createdAt: '2026-08-15T12:00:00' })
    const all = await listMessages()
    expect(all.map(m => m.content)).toEqual(['第一条', '第二条', '第三条'])
  })

  it('limit 截断:返回最近 N 条', async () => {
    for (let i = 0; i < 5; i++) {
      await addMessage({ ...base(), content: `消息${i}`, createdAt: `2026-08-15T0${i}:00:00` })
    }
    const recent = await listMessages(3)
    expect(recent.map(m => m.content)).toEqual(['消息2', '消息3', '消息4'])
  })

  it('clearMessages 清空全部', async () => {
    await addMessage(base())
    await addMessage({ ...base(), role: 'assistant', content: 'ok' })
    await clearMessages()
    expect(await listMessages()).toHaveLength(0)
  })
})
