import { useCallback, useEffect, useState } from 'react'
import { getSetting, setSetting } from '../db/settings'
import type { LLMConfig } from '../llm/types'

export function useLLMSettings() {
  const [config, setConfig] = useState<LLMConfig | null>(null)

  useEffect(() => {
    void (async () => {
      const [baseUrl, apiKey, model] = await Promise.all([getSetting('llm_base_url'), getSetting('llm_api_key'), getSetting('llm_model')])
      if (baseUrl && apiKey && model) setConfig({ baseUrl, apiKey, model })
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
