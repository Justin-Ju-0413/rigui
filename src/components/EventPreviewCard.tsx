import dayjs from 'dayjs'
import type { ParsedEventInput } from '../ai/schema'

interface Props {
  parsed: ParsedEventInput
  conflicts: string[]
  onConfirm: () => void
  onEdit: (patch: Partial<ParsedEventInput>) => void
  onCancel: () => void
}

export default function EventPreviewCard({ parsed, conflicts, onConfirm, onCancel }: Props) {
  return (
    <div data-testid="preview-card" className="space-y-2 rounded-xl border p-3 shadow">
      <h3 className="font-semibold">{parsed.title}</h3>
      <p className="text-sm text-gray-600">
        {parsed.allDay ? '全天' : `${dayjs(parsed.startTime).format('M月D日 HH:mm')}–${parsed.endTime ? dayjs(parsed.endTime).format('HH:mm') : ''}`}
        {parsed.location ? ` @ ${parsed.location}` : ''}
      </p>
      {parsed.repeat && parsed.repeat !== 'none' && <p className="text-xs text-gray-500">重复：{parsed.repeat}</p>}
      {parsed.reminderOffsets && parsed.reminderOffsets.length > 0 && (
        <p className="text-xs text-gray-500">提醒：提前 {parsed.reminderOffsets.join('/')} 分钟</p>
      )}
      {conflicts.length > 0 && (
        <div data-testid="preview-conflicts" className="rounded bg-amber-50 p-2 text-xs text-amber-800">时间冲突：{conflicts.join('、')}</div>
      )}
      <div className="flex gap-2">
        <button onClick={onConfirm} className="flex-1 rounded-lg bg-indigo-600 py-2 text-white">确认创建</button>
        <button onClick={onCancel} className="flex-1 rounded-lg border py-2">取消</button>
      </div>
    </div>
  )
}
