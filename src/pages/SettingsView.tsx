import { useState } from 'react'
import { useLLMSettings } from '../hooks/useLLMSettings'
import { chatCompletion } from '../llm/client'

export default function SettingsView() {
  const { config, save, hasConfig } = useLLMSettings()
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(config?.apiKey ?? '')
  const [model, setModel] = useState(config?.model ?? '')
  const [status, setStatus] = useState<string | null>(null)

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
    </div>
  )
}
