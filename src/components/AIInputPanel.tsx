import { useState } from 'react'
import { useLLMConfig } from '../context/LLMContext'
import { useEvents } from '../hooks/useEvents'
import { notifyEventsChanged } from '../events/eventBus'
import { parseEventToInput, validateParsedEvent } from '../ai/parseEvent'
import { findConflicts } from '../planner/conflicts'
import { getAllEvents } from '../db/crud'
import type { ParsedEventInput } from '../ai/schema'
import EventPreviewCard from './EventPreviewCard'
import dayjs from 'dayjs'

export default function AIInputPanel() {
  const { config } = useLLMConfig()
  const { save } = useEvents()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParsedEventInput | null>(null)
  const [conflicts, setConflicts] = useState<string[]>([])

  const refreshConflicts = async (candidate: ParsedEventInput) => {
    const fullCandidate = {
      ...candidate,
      id: undefined,
      completed: false,
      createdAt: '',
      startTime: candidate.startTime,
      endTime: candidate.endTime ?? dayjs(candidate.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
      allDay: candidate.allDay ?? false,
      reminderOffsets: candidate.reminderOffsets ?? [],
      repeat: candidate.repeat ?? 'none',
    }
    const found = findConflicts(await getAllEvents(), fullCandidate, '2000-01-01T00:00:00', '2100-12-31T23:59:59')
    setConflicts(found.map(e => `${e.title}（${dayjs(e.startTime).format('MM-DD HH:mm')}）`))
  }

  const handleParse = async () => {
    if (!config) { setError('请先在设置页配置 LLM'); return }
    if (!text.trim()) { setError('请输入日程描述'); return }
    setLoading(true)
    setError('')
    const result = await parseEventToInput(config, text.trim(), dayjs().format('YYYY-MM-DDTHH:mm:ss'), [])
    setLoading(false)
    if (!result.ok) { setError(`解析失败：${result.errors.join('；')}`); setParsed(null); return }
    setParsed(result.data)
    void refreshConflicts(result.data)
  }

  const handleConfirm = async () => {
    if (!parsed) return
    const check = validateParsedEvent(parsed)
    if (!check.ok) { setError(`日程信息有误：${check.errors.join('；')}`); return }
    await save({
      title: parsed.title,
      startTime: parsed.startTime,
      endTime: parsed.endTime ?? dayjs(parsed.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
      allDay: parsed.allDay ?? false,
      location: parsed.location,
      reminderOffsets: parsed.reminderOffsets ?? [],
      repeat: parsed.repeat ?? 'none',
    })
    notifyEventsChanged()
    setParsed(null)
    setText('')
  }

  const handleEdit = (patch: Partial<ParsedEventInput>) => {
    if (!parsed) return
    const next = { ...parsed, ...patch }
    setParsed(next)
    void refreshConflicts(next)
  }

  return (
    <div className="sticky bottom-0 z-20 border-t border-[var(--border)] bg-[var(--bg)]/95 px-4 pb-24 pt-3 backdrop-blur md:py-3">
      <div className="mx-auto max-w-3xl">
        {error && <p data-testid="parse-error" className="mb-2 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
        {parsed && (
          <div className="mb-2">
            <EventPreviewCard parsed={parsed} conflicts={conflicts} onConfirm={() => void handleConfirm()}
              onEdit={handleEdit} onCancel={() => setParsed(null)} />
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea aria-label="描述你的日程" value={text} onChange={e => setText(e.target.value)}
            placeholder="输入日程描述，用自然语言排期…（例如：下周二下午3点和老王开会）"
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleParse() }
            }}
            data-testid="ai-input"
            className="input min-h-11 max-h-40 flex-1 resize-none py-3" />
          <button onClick={() => void handleParse()} disabled={loading || !text.trim()}
            data-testid="ai-send"
            className="btn btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg leading-none">
            {loading ? '…' : '→'}
          </button>
        </div>
      </div>
    </div>
  )
}
