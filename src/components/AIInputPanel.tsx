import { useState } from 'react'
import { useLLMConfig } from '../context/LLMContext'
import { useEvents } from '../hooks/useEvents'
import { parseEventToInput } from '../ai/parseEvent'
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

  const handleParse = async () => {
    if (!config) { setError('请先在设置页配置 LLM'); return }
    if (!text.trim()) { setError('请输入日程描述'); return }
    setLoading(true)
    setError('')
    const result = await parseEventToInput(config, text.trim(), dayjs().format('YYYY-MM-DDTHH:mm:ss'), [])
    setLoading(false)
    if (!result.ok) { setError(`解析失败：${result.errors.join('；')}`); setParsed(null); return }
    setParsed(result.data)
    const candidate = {
      ...result.data,
      id: undefined,
      completed: false,
      createdAt: '',
      startTime: result.data.startTime,
      endTime: result.data.endTime ?? dayjs(result.data.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
      allDay: result.data.allDay ?? false,
      reminderOffsets: result.data.reminderOffsets ?? [],
      repeat: result.data.repeat ?? 'none',
    }
    const found = findConflicts(await getAllEvents(), candidate, '2000-01-01T00:00:00', '2100-12-31T23:59:59')
    setConflicts(found.map(e => `${e.title}（${dayjs(e.startTime).format('MM-DD HH:mm')}）`))
  }

  const handleConfirm = async () => {
    if (!parsed) return
    await save({
      title: parsed.title,
      startTime: parsed.startTime,
      endTime: parsed.endTime ?? dayjs(parsed.startTime).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
      allDay: parsed.allDay ?? false,
      location: parsed.location,
      reminderOffsets: parsed.reminderOffsets ?? [],
      repeat: parsed.repeat ?? 'none',
    })
    setOpen(false)
    setParsed(null)
    setText('')
  }

  const handleEdit = (patch: Partial<ParsedEventInput>) => setParsed(p => (p ? { ...p, ...patch } : p))

  return (
    <>
      <button aria-label="AI 输入" onClick={() => { setOpen(true); if (!config) setError('请先在设置页配置 LLM') }}
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white shadow-lg">+AI</button>
      {open && (
        <div data-testid="ai-panel" className="fixed inset-0 z-30 flex flex-col justify-end bg-black/30" onClick={() => setOpen(false)}>
          <div className="rounded-t-2xl bg-white p-4" onClick={e => e.stopPropagation()}>
            <h2 className="mb-2 font-semibold">AI 日程输入</h2>
            <textarea aria-label="描述你的日程" value={text} onChange={e => setText(e.target.value)}
              placeholder="例如：下周二下午3点和老王开会，地点会议室A，提前10分钟提醒"
              className="h-20 w-full rounded-lg border p-2" />
            <button onClick={() => void handleParse()} disabled={loading}
              className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-white disabled:opacity-50">
              {loading ? '解析中…' : '解析'}
            </button>
            {error && <p data-testid="parse-error" className="mt-2 text-sm text-red-600">{error}</p>}
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
