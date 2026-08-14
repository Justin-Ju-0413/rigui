import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import dayjs from 'dayjs'
import ChatView from './ChatView'
import { LLMProvider } from '../context/LLMContext'
import { __setLLMTransport } from '../llm/client'
import { db } from '../db/schema'
import { setSetting } from '../db/settings'
import { addEvent } from '../db/crud'
import { clearMessages, listMessages } from '../db/chat'

const mount = () => render(<LLMProvider><ChatView /></LLMProvider>)

const respond = (content: string) =>
  __setLLMTransport(async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

describe('ChatView', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    await setSetting('llm_base_url', 'https://api.example.com/v1')
    await setSetting('llm_api_key', 'sk-test')
    await setSetting('llm_model', 'test-model')
  })

  it('空态显示快捷问句,点击即发送并渲染双方气泡', async () => {
    respond(JSON.stringify({ reply: '好的，我记下了。' }))
    const user = userEvent.setup()
    mount()
    expect(screen.getByTestId('chat-empty')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /明天的安排/ }))
    expect(await screen.findByText('好的，我记下了。')).toBeInTheDocument()
    expect(screen.getAllByTestId(/chat-message/)).toHaveLength(2)
  })

  it('create_event 动作渲染确认卡,确认后入库', async () => {
    respond(JSON.stringify({
      reply: '已为你安排明天的会。',
      actions: [{ type: 'create_event', payload: { title: '和老板开会', startTime: dayjs().add(1, 'day').format('YYYY-MM-DD[T]09:00:00'), endTime: dayjs().add(1, 'day').format('YYYY-MM-DD[T]10:00:00') } }],
    }))
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), '明天早上9点开会')
    await user.click(screen.getByTestId('chat-send'))
    expect(await screen.findByTestId('preview-card')).toBeInTheDocument()
    expect(screen.getByDisplayValue('和老板开会')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '确认创建' }))
    await waitFor(async () => expect(await db.events.count()).toBe(1))
  })

  it('取消动作不入库', async () => {
    respond(JSON.stringify({
      reply: '已为你安排明天的会。',
      actions: [{ type: 'create_event', payload: { title: '不要的会', startTime: dayjs().add(1, 'day').format('YYYY-MM-DD[T]09:00:00') } }],
    }))
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), '明天早上9点开会')
    await user.click(screen.getByTestId('chat-send'))
    await screen.findByTestId('preview-card')
    await user.click(screen.getByRole('button', { name: '取消' }))
    await waitFor(async () => expect(await db.events.count()).toBe(0))
    expect(screen.queryByTestId('preview-card')).not.toBeInTheDocument()
  })

  it('LLM 失败显示错误与重试,重试成功', async () => {
    let calls = 0
    __setLLMTransport(async () => {
      calls++
      if (calls === 1) return new Response('boom', { status: 500 })
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"reply":"这次成功了"}' } }] }), { status: 200 })
    })
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), '明天有什么安排')
    await user.click(screen.getByTestId('chat-send'))
    expect(await screen.findByTestId('chat-error')).toBeInTheDocument()
    await user.click(screen.getByTestId('chat-retry'))
    expect(await screen.findByText('这次成功了')).toBeInTheDocument()
  })

  it('查询动作回填进历史,第二轮请求携带日程数据', async () => {
    const today = dayjs().format('YYYY-MM-DD')
    await addEvent({ title: '健身', startTime: `${today}T19:00:00`, endTime: `${today}T20:00:00`, allDay: false, reminderOffsets: [], repeat: 'none' })
    let bodies: string[] = []
    __setLLMTransport(async (url, init) => {
      bodies.push(String(init?.body))
      const round = bodies.length
      const content = round === 1
        ? JSON.stringify({ reply: '让我查一下。', actions: [{ type: 'query_events', payload: { range: 'today' } }] })
        : JSON.stringify({ reply: '你今晚 19:00 有健身。' })
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), '今晚有什么安排')
    await user.click(screen.getByTestId('chat-send'))
    await screen.findByText('让我查一下。')
    await user.type(screen.getByTestId('chat-input'), '那我晚上有空吗')
    await user.click(screen.getByTestId('chat-send'))
    await screen.findByText('你今晚 19:00 有健身。')
    expect(bodies[1]).toContain('健身')
    expect(await listMessages()).toHaveLength(4)
  })

  it('delete_event 确认后删除日程', async () => {
    const ev = await addEvent({ title: '要删的会', startTime: dayjs().add(1, 'day').format('YYYY-MM-DD[T]09:00:00'), endTime: dayjs().add(1, 'day').format('YYYY-MM-DD[T]10:00:00'), allDay: false, reminderOffsets: [], repeat: 'none' })
    respond(JSON.stringify({
      reply: '好的，删除这个会。',
      actions: [{ type: 'delete_event', payload: { id: ev } }],
    }))
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), '删掉明天的会')
    await user.click(screen.getByTestId('chat-send'))
    expect(await screen.findByTestId('action-card')).toBeInTheDocument()
    expect(await screen.findByText(/要删的会/)).toBeInTheDocument()
    await user.click(screen.getByTestId('action-confirm'))
    await waitFor(async () => expect(await db.events.count()).toBe(0))
  })

  it('重新挂载恢复历史对话', async () => {
    respond(JSON.stringify({ reply: '第一条回复' }))
    const user = userEvent.setup()
    const first = mount()
    await user.type(screen.getByTestId('chat-input'), '你好')
    await user.click(screen.getByTestId('chat-send'))
    await screen.findByText('第一条回复')
    first.unmount()

    respond(JSON.stringify({ reply: '第二条回复' }))
    mount()
    expect(await screen.findByText('第一条回复')).toBeInTheDocument()
    await user.type(screen.getByTestId('chat-input'), '在吗')
    await user.click(screen.getByTestId('chat-send'))
    expect(await screen.findByText('第二条回复')).toBeInTheDocument()
  })

  it('清空对话后回到空态', async () => {
    respond(JSON.stringify({ reply: '好的' }))
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), 'hi')
    await user.click(screen.getByTestId('chat-send'))
    await screen.findByText('好的')
    await user.click(screen.getByTestId('chat-clear'))
    expect(await screen.findByTestId('chat-empty')).toBeInTheDocument()
    expect(await listMessages()).toHaveLength(0)
  })

  it('未配置 LLM 时提示先到设置页配置', async () => {
    await db.settings.clear()
    const user = userEvent.setup()
    mount()
    await user.type(screen.getByTestId('chat-input'), '开会')
    await user.click(screen.getByTestId('chat-send'))
    expect(await screen.findByText(/请先在设置/)).toBeInTheDocument()
  })
})
