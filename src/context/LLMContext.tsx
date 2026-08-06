import { createContext, useContext, type ReactNode } from 'react'
import { useLLMSettings } from '../hooks/useLLMSettings'
import type { LLMConfig } from '../llm/types'

const LLMContext = createContext<{ config: LLMConfig | null }>({ config: null })

export function LLMProvider({ children }: { children: ReactNode }) {
  const { config } = useLLMSettings()
  return <LLMContext.Provider value={{ config }}>{children}</LLMContext.Provider>
}

export function useLLMConfig() {
  return useContext(LLMContext)
}
