import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { useLLMSettings } from '../hooks/useLLMSettings'
import { chatCompletion } from '../llm/client'
import { addEvent, getAllEvents } from '../db/crud'
import { generateIcs } from '../ics/generator'
import { downloadFile, exportJson, parseImportJson } from '../ics/transfer'
import { notifyEventsChanged } from '../events/eventBus'
import { getSetting, setSetting } from '../db/settings'
import { DEFAULT_REPORT_TIME } from '../notify/weeklyReport'

export default function SettingsView() {
  const { config, save, hasConfig } = useLLMSettings()
  // 初始预填 .env.local 默认值（config 加载后会同步覆盖）
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? import.meta.env.VITE_LLM_BASE_URL ?? '')
  const [apiKey, setApiKey] = useState(config?.apiKey ?? import.meta.env.VITE_LLM_API_KEY ?? '')
  const [model, setModel] = useState(config?.model ?? import.meta.env.VITE_LLM_MODEL ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // 周报推送设置（默认开启、周日 20:00）
  const [reportEnabled, setReportEnabled] = useState(true)
  const [reportTime, setReportTime] = useState(DEFAULT_REPORT_TIME)
  const [reportMsg, setReportMsg] = useState('')
  useEffect(() => {
    void (async () => {
      const [enabled, time] = await Promise.all([getSetting('weekly_report_enabled'), getSetting('weekly_report_time')])
      if (enabled !== null) setReportEnabled(enabled !== '0')
      if (time) setReportTime(time)
    })()
  }, [])

  const handleSaveReport = async () => {
    await setSetting('weekly_report_enabled', reportEnabled ? '1' : '0')
    await setSetting('weekly_report_time', reportTime)
    setReportMsg('周报设置已保存')
  }

  const [prevConfig, setPrevConfig] = useState(config)
  if (config !== prevConfig) {
    setPrevConfig(config)
    if (config) {
      setBaseUrl(config.baseUrl)
      setApiKey(config.apiKey)
      setModel(config.model)
    }
  }

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
    notifyEventsChanged()
    setImportMsg(`已导入 ${parsed.events.length} 条`)
  }

  const handleSave = async () => {
    if (!baseUrl.trim() && !apiKey.trim() && !model.trim()) { setStatus('请先填写完整配置'); return }
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
    <div className="space-y-3 p-4 md:mx-auto md:max-w-2xl md:p-6" data-testid="settings-view">
      <h1 className="mb-1 pt-2 text-xl font-semibold tracking-tight md:pt-0 md:text-2xl">设置</h1>
      <section className="card space-y-3 rounded-lg p-4">
        {hasConfig && <p className="text-sm text-[var(--ok)]">已配置 LLM</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[var(--text-secondary)]">API 地址
            <input aria-label="API 地址" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.deepseek.com" className="input mt-1" />
          </label>
          <label className="block text-xs font-medium text-[var(--text-secondary)]">API Key
            <input aria-label="API Key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="input mt-1" />
          </label>
        </div>
        <label className="block text-xs font-medium text-[var(--text-secondary)]">模型
          <input aria-label="模型" value={model} onChange={e => setModel(e.target.value)} placeholder="deepseek-v4-flash" className="input mt-1" />
        </label>
        <div className="flex gap-2">
          <button onClick={() => void handleSave()} className="btn btn-primary flex-1">保存</button>
          <button onClick={() => void handleTest()} className="btn flex-1">测试连接</button>
        </div>
        {status && <p data-testid="status" className="text-sm text-[var(--text-secondary)]">{status}</p>}
      </section>
      <section className="card space-y-3 rounded-lg p-4" data-testid="report-section">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">周报推送</h2>
        <p className="text-xs text-[var(--text-tertiary)]">每周日 20:00 自动推送本周简报通知（可修改时间）。</p>
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <input type="checkbox" aria-label="启用周报推送" checked={reportEnabled} onChange={e => setReportEnabled(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          启用周报推送
        </label>
        <label className="block text-xs font-medium text-[var(--text-secondary)]">推送时间
          <input type="time" aria-label="周报推送时间" value={reportTime} onChange={e => setReportTime(e.target.value)} className="input mt-1" />
        </label>
        <div className="flex items-center gap-2">
          <button onClick={() => void handleSaveReport()} className="btn btn-primary flex-1">保存周报设置</button>
          {reportMsg && <p data-testid="report-msg" className="text-sm text-[var(--text-secondary)]">{reportMsg}</p>}
        </div>
      </section>
      <section className="card space-y-3 rounded-lg p-4" data-testid="transfer-section">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">导出 / 导入</h2>
        <div className="flex gap-2">
          <button onClick={() => void handleExportIcs()} className="btn flex-1 text-xs">导出全部 ICS</button>
          <button onClick={() => void handleExportIcs({ start: dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss'), end: dayjs().endOf('month').format('YYYY-MM-DDTHH:mm:ss') })} className="btn flex-1 text-xs">导出本月 ICS</button>
          <button onClick={() => void handleExportJson()} className="btn flex-1 text-xs">导出 JSON</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="btn flex-1">导入 JSON</button>
          <input type="file" accept="application/json" hidden ref={fileRef} onChange={e => e.target.files?.[0] && void handleImportJson(e.target.files[0])} />
        </div>
        {importMsg && <p data-testid="transfer-msg" className="text-sm text-[var(--text-secondary)]">{importMsg}</p>}
      </section>
    </div>
  )
}