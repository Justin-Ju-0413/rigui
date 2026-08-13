import { useCallback, useEffect, useState } from 'react'
import { getSetting, setSetting } from '../db/settings'
import type { LLMConfig } from '../llm/types'

// 环境变量默认配置（.env.local 注入，不入库）：设置页未保存时直接可用
const envDefaults: LLMConfig = {
  baseUrl: import.meta.env.VITE_LLM_BASE_URL ?? '',
  apiKey: import.meta.env.VITE_LLM_API_KEY ?? '',
  model: import.meta.env.VITE_LLM_MODEL ?? '',
}

const hasEnvDefaults = envDefaults.baseUrl && envDefaults.apiKey && envDefaults.model

export function useLLMSettings() {
  const [config, setConfig] = useState<LLMConfig | null>(null)

  useEffect(() => {
    void (async () => {
      const [baseUrl, apiKey, model] = await Promise.all([getSetting('llm_base_url'), getSetting('llm_api_key'), getSetting('llm_model')])
      if (baseUrl && apiKey && model) {
        setConfig({ baseUrl, apiKey, model })
      } else if (hasEnvDefaults) {
        // 本机未配置时回退到 .env.local 默认值
        setConfig(envDefaults)
      }
    })()
  }, [])

  const save = useCallback(async (cfg: LLMConfig) => {
    await setSetting('llm_base_url', cfg.baseUrl)
    await setSetting('llm_api_key', cfg.apiKey)
    await setSetting('llm_model', cfg.model)
    setConfig(cfg)
  }, [])

  return { config, save, hasConfig: config !== null }
}
