interface Props {
  role: 'user' | 'assistant'
  content: string
  time?: string
}

/** 对话气泡:user 右侧暖色底 / assistant 左侧液态玻璃卡 */
export default function ChatMessage({ role, content, time }: Props) {
  const isUser = role === 'user'
  return (
    <div data-testid={`chat-message-${role}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm ${isUser
        ? 'rounded-br-md'
        : 'card rounded-bl-md'}`}
        style={isUser ? { background: 'var(--accent-soft)' } : undefined}>
        {content}
        {time && <div className="mt-1 text-right text-[10px] text-[var(--text-tertiary)]">{time}</div>}
      </div>
    </div>
  )
}
