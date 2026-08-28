import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useLLMConfig } from '../context/LLMContext'
import { addMessage, clearMessages, listMessages } from '../db/chat'
import { sendChatMessage, type ChatAction } from '../ai/chat'
import { executeAction } from '../ai/chatExecutor'
import ChatMessage from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import Suggestions from '../components/chat/Suggestions'
import ActionCard from '../components/chat/ActionCard'
import Spinner from '../components/Spinner'

/** 内存消息:tool 回填(不落库,仅参与上下文)与 db 消息统一 */
interface ViewMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: ChatAction[]
  isTool?: boolean
}

export default function ChatView() {
  const { config } = useLLMConfig()
  const [messages, setMessages] = useState<ViewMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryInput, setRetryInput] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const idSeq = useRef(0)
  const nextId = (prefix: string) => `${prefix}-${idSeq.current++}`

  useEffect(() => {
    let cancelled = false
    void listMessages().then(list => {
      if (cancelled) return
      setMessages(list.map(m => ({ id: String(m.id), role: m.role, content: m.content })))
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const appendLocal = (m: ViewMessage) => setMessages(prev => [...prev, m])

  const handleSend = async (rawInput: string) => {
    const text = rawInput.trim()
    if (!text || loading) return
    if (!config) { setError('请先在设置页配置 LLM 后使用对话'); return }
    setError('')
    setRetryInput(null)
    const userMsg: ViewMessage = { id: nextId('u'), role: 'user', content: text }
    appendLocal(userMsg)
    await addMessage({ role: 'user', content: text, createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss') })
    setInput('')
    setLoading(true)
    const history: ViewMessage[] = [...messages, userMsg]
    const result = await sendChatMessage(config, history, text)
    if (!result.ok) {
      setLoading(false)
      setError(result.errorMessage ?? '请求失败')
      setRetryInput(text)
      return
    }
    const newMessages: ViewMessage[] = []
    for (const t of result.toolMessages) {
      newMessages.push({ id: nextId('t'), role: 'assistant', content: t, isTool: true })
    }
    const replyMsg: ViewMessage = {
      id: nextId('a'),
      role: 'assistant',
      content: result.reply,
      actions: result.actions,
    }
    newMessages.push(replyMsg)
    for (const m of newMessages) {
      if (m.isTool) continue // tool 回填不落库
      await addMessage({
        role: m.role,
        content: m.content,
        actionsJson: m.actions?.length ? JSON.stringify(m.actions) : undefined,
        createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      })
    }
    setMessages(prev => [...prev, ...newMessages])
    setLoading(false)
  }

  const handleRetry = () => {
    if (retryInput) void handleSend(retryInput)
  }

  /** 确认/取消按消息 id 定位（动作对象经 ActionCard 编辑后引用已变化，不能用引用匹配） */
  const handleConfirm = async (messageId: string, action: ChatAction) => {
    const result = await executeAction(action)
    if (!result.ok) { setError(result.message); return }
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, actions: undefined } : m)))
    const confirmMsg: ViewMessage = { id: nextId('c'), role: 'assistant', content: result.message }
    setMessages(prev => [...prev, confirmMsg])
    await addMessage({ role: 'assistant', content: result.message, createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss') })
  }

  const handleCancel = (messageId: string) => {
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, actions: undefined } : m)))
  }

  const handleClear = async () => {
    await clearMessages()
    setMessages([])
    setError('')
    setRetryInput(null)
  }

  return (
    <div data-testid="chat-view" className="flex h-full min-h-[70dvh] flex-col md:min-h-[75dvh]">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">对话</h2>
        <button data-testid="chat-clear" onClick={() => void handleClear()}
          className="btn px-3 py-1 text-xs">清空对话</button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && !loading && (
          <div data-testid="chat-empty" className="card flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
            <div className="text-3xl">🗓️</div>
            <div>
              <p className="text-sm font-semibold">和日规对话，安排你的日程</p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">自然语言建日程、查安排、排期目标、周报小结</p>
            </div>
            <Suggestions onPick={t => void handleSend(t)} />
          </div>
        )}
        {messages.map(m => {
          if (m.isTool) return null
          return (
            <div key={m.id} className="space-y-2">
              <ChatMessage role={m.role} content={m.content} />
              {m.actions?.map((a, i) => (
                <ActionCard key={i} action={a}
                  onConfirm={act => void handleConfirm(m.id, act)}
                  onCancel={() => handleCancel(m.id)} />
              ))}
            </div>
          )
        })}
        {loading && (
          <div className="flex justify-start">
            <div data-testid="chat-loading" className="card flex items-center rounded-2xl rounded-bl-md px-4 py-3">
              <Spinner label="思考中…" />
            </div>
          </div>
        )}
        {error && (
          <div data-testid="chat-error" className="rounded-lg p-2.5 text-xs" style={{ background: 'var(--warn-bg)', color: 'var(--warn-fg)' }}>
            {error}
            {retryInput && (
              <button data-testid="chat-retry" onClick={handleRetry} className="btn ml-2 px-2 py-0.5 text-xs">重试</button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 移动端 sticky bottom 让出底部导航高度,桌面贴底 */}
      <div className="frosted sticky bottom-24 z-10 mt-2 rounded-2xl p-3 md:bottom-0">
        <ChatInput value={input} onChange={setInput} onSend={() => void handleSend(input)} disabled={loading} />
      </div>
    </div>
  )
}
