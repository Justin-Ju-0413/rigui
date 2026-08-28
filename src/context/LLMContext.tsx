import { createContext, useContext, type ReactNode } from 'react'
import { useLLMSettings } from '../hooks/useLLMSettings'
import type { LLMConfig } from '../llm/types'

const LLMContext = createContext<{ config: LLMConfig | null }>({ config: null })

export function LLMProvider({ children }: { children: ReactNode }) {
  const { config } = useLLMSettings()
  return <LLMContext.Provider value={{ config }}>{children}</LLMContext.Provider>
}

// Fast Refresh 规则要求文件只导出组件；此处 context + hook 是常规组合，忽略该提示。
// eslint-disable-next-line react-refresh/only-export-components
export function useLLMConfig() {
  return useContext(LLMContext)
}
