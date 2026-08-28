// Electron preload 注入的桥（浏览器环境下 window.rigui 为 undefined）
// 注意：本文件必须保持无 import/export（保持全局声明，否则 Window 扩展失效）

interface LLMProxyRequest {
  baseUrl: string
  apiKey: string
  model: string
  messages: { role: string; content: string }[]
  temperature?: number
  responseFormat?: 'json_object'
  maxTokens?: number
  timeoutMs?: number
}

interface LLMProxyResult {
  content: string | null
  errorKind?: 'offline' | 'config' | 'timeout' | 'network' | 'http'
  errorMessage?: string
}

interface RiguiBridge {
  isElectron: true
  notify(title: string, body: string): void
  saveFile(defaultName: string, content: string): Promise<{ canceled: boolean; path: string | null }>
  /** main 进程代理 LLM 请求（Node fetch 无 CORS 限制） */
  llmChat(req: LLMProxyRequest): Promise<LLMProxyResult>
}

interface Window {
  rigui?: RiguiBridge
}
