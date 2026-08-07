import { useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useLLMSettings } from '../hooks/useLLMSettings'
import { chatCompletion } from '../llm/client'
import { addEvent, getAllEvents } from '../db/crud'
import { generateIcs } from '../ics/generator'
import { downloadFile, exportJson, parseImportJson } from '../ics/transfer'

export default function SettingsView() {
  const { config, save, hasConfig } = useLLMSettings()
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(config?.apiKey ?? '')
  const [model, setModel] = useState(config?.model ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExportIcs = async (range?: { start: string; end: string }) => {
    const events = await getAllEvents()
    if (events.length === 0) { setImportMsg('没有可导出的事件'); return }
    const filename = range ? 'rigui-month.ics' : 'rigui-calendar.ics'
    downloadFile(filename, generateIcs(events, range?.start, range?.end), 'text/calendar')
  }

  const handleExportJson = async () => {
    const events = await getAllEvents()
    downloadFile('rigui-backup.json', exportJson(events), 'application/json')
  }

  const handleImportJson = async (file: File) => {
    const text = await file.text()
    const parsed = parseImportJson(text)
    if (!parsed.ok) { setImportMsg(`导入失败：${parsed.error}`); return }
    for (const e of parsed.events) await addEvent(e)
    setImportMsg(`已导入 ${parsed.events.length} 条`)
  }

  const handleSave = async () => {
    await save({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() })
    setStatus('已保存')
  }

  const handleTest = async () => {
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) { setStatus('请先填写完整配置'); return }
    const result = await chatCompletion(
      { baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim() },
      [{ role: 'user', content: 'ping' }],
      { maxTokens: 4 },
    )
    setStatus(result.errorKind ? `连接失败：${result.errorMessage ?? result.errorKind}` : '连接成功')
  }

  return (
    <div className="space-y-3 p-4" data-testid="settings-view">
      <h1 className="text-lg font-semibold">设置</h1>
      {hasConfig && <p className="text-sm text-green-600">已配置 LLM</p>}
      <label className="block text-sm">API 地址
        <input aria-label="API 地址" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1" className="w-full rounded-lg border p-2" />
      </label>
      <label className="block text-sm">API Key
        <input aria-label="API Key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full rounded-lg border p-2" />
      </label>
      <label className="block text-sm">模型
        <input aria-label="模型" value={model} onChange={e => setModel(e.target.value)} placeholder="deepseek-chat" className="w-full rounded-lg border p-2" />
      </label>
      <div className="flex gap-2">
        <button onClick={() => void handleSave()} className="flex-1 rounded-lg bg-indigo-600 py-2 text-white">保存</button>
        <button onClick={() => void handleTest()} className="flex-1 rounded-lg border py-2">测试连接</button>
      </div>
      {status && <p data-testid="status" className="text-sm text-gray-600">{status}</p>}
      <div className="space-y-2 border-t pt-3" data-testid="transfer-section">
        <h2 className="text-sm font-semibold">导出 / 导入</h2>
        <div className="flex gap-2">
          <button onClick={() => void handleExportIcs()} className="flex-1 rounded-lg border py-2">导出全部 ICS</button>
          <button onClick={() => void handleExportIcs({ start: dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss'), end: dayjs().endOf('month').format('YYYY-MM-DDTHH:mm:ss') })} className="flex-1 rounded-lg border py-2">导出本月 ICS</button>
          <button onClick={() => void handleExportJson()} className="flex-1 rounded-lg border py-2">导出 JSON</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-lg border py-2">导入 JSON</button>
          <input type="file" accept="application/json" hidden ref={fileRef} onChange={e => e.target.files?.[0] && void handleImportJson(e.target.files[0])} />
        </div>
        {importMsg && <p data-testid="transfer-msg" className="text-sm text-gray-600">{importMsg}</p>}
      </div>
    </div>
  )
}
