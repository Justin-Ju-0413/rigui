export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export type LLMErrorKind = 'offline' | 'config' | 'timeout' | 'network' | 'http'

export interface LLMChatResult {
  content: string | null
  errorKind?: LLMErrorKind
  errorMessage?: string
}
