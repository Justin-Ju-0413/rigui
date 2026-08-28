interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  disabled?: boolean
}

/** 对话输入区:textarea + 发送按钮,Enter 发送(IME 选词防护) */
export default function ChatInput({ value, onChange, onSend, disabled }: Props) {
  return (
    <div className="flex items-end gap-2">
      <textarea
        aria-label="输入对话"
        data-testid="chat-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="和日规对话：安排日程、查安排、排期目标…"
        rows={1}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !disabled && value.trim()) {
            e.preventDefault()
            onSend()
          }
        }}
        className="input min-h-11 max-h-40 flex-1 resize-none py-3" />
      <button
        aria-label="发送"
        data-testid="chat-send"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="btn btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg leading-none">
        {disabled ? '…' : '→'}
      </button>
    </div>
  )
}
