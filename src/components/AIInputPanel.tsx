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
  const [open, setOpen] = useState(false)
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
    setOpen(false)
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
    <>
      <button aria-label="AI 输入" onClick={() => { setOpen(true); if (!config) setError('请先在设置页配置 LLM') }}
        className="glass-orb fixed bottom-28 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold text-white">+AI</button>
      {open && (
        <div data-testid="ai-panel" className="fixed inset-0 z-30 flex flex-col justify-end bg-black/30 md:justify-center md:px-6" onClick={() => setOpen(false)}>
          <div className="glass-strong rounded-t-[32px] p-4 pb-8 md:mx-auto md:max-w-lg md:rounded-[32px] md:pb-4" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--text-tertiary)]/40" />
            <h2 className="mb-2 font-semibold">AI 日程输入</h2>
            <textarea aria-label="描述你的日程" value={text} onChange={e => setText(e.target.value)}
              placeholder="例如：下周二下午3点和老王开会，地点会议室A，提前10分钟提醒"
              className="glass-input h-24 resize-none" />
            <button onClick={() => void handleParse()} disabled={loading}
              className="glass-btn glass-btn-primary mt-2 w-full">
              {loading ? '解析中…' : '解析'}
            </button>
            {error && <p data-testid="parse-error" className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            {parsed && (
              <div className="mt-2">
                <EventPreviewCard parsed={parsed} conflicts={conflicts} onConfirm={() => void handleConfirm()}
                  onEdit={handleEdit} onCancel={() => setParsed(null)} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
