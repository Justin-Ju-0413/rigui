import type { LLMChatResult, LLMConfig, LLMErrorKind } from './types'

export type { LLMChatResult, LLMConfig, LLMErrorKind } from './types'

interface ChatOptions {
  temperature?: number
  responseFormat?: 'json_object'
  maxTokens?: number
  timeoutMs?: number
}

let transport: typeof fetch = fetch

export function __setLLMTransport(next: typeof fetch): () => void {
  const prev = transport
  transport = next
  return () => { transport = prev }
}

function errorMessage(status: number): string {
  if (status === 401 || status === 403) return 'API Key 无效'
  if (status === 429) return '请求过于频繁'
  if (status === 404) return '模型或接口不存在'
  return `服务端错误 (${status})`
}

export async function chatCompletion(
  config: LLMConfig,
  messages: { role: string; content: string }[],
  opts: ChatOptions = {},
): Promise<LLMChatResult> {
  if (!config.apiKey) return { content: null, errorKind: 'config', errorMessage: '未配置 API Key' }
  if (!config.baseUrl) return { content: null, errorKind: 'config', errorMessage: '未配置 API 地址' }
  // Electron 桌面端：经 main 进程代理请求（Node fetch 无 CORS 限制，浏览器网页跨域被端点拦截）
  const rigui = window.rigui
  if (rigui?.isElectron) {
    return rigui.llmChat({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages,
      temperature: opts.temperature ?? 0.3,
      ...(opts.responseFormat ? { responseFormat: opts.responseFormat } : {}),
      ...(opts.maxTokens ? { maxTokens: opts.maxTokens } : {}),
      timeoutMs: opts.timeoutMs,
    })
  }
  const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000)
  try {
    const res = await transport(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        ...(opts.responseFormat ? { response_format: { type: 'json_object' } } : {}),
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const kind: LLMErrorKind = res.status === 401 || res.status === 403 ? 'config' : 'http'
      // 优先透传服务端 body 里的真实原因（如 401 + CreditsError 余额不足），再回退状态码映射
      const errData = await res.json().catch(() => null) as { error?: { message?: string } } | null
      if (errData?.error?.message) {
        return { content: null, errorKind: kind, errorMessage: errData.error.message }
      }
      return { content: null, errorKind: kind, errorMessage: errorMessage(res.status) }
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    // 部分端点 200 时也返回 { error } 对象（如余额不足），透传真实原因而非笼统的"网络异常"
    if (data.error?.message) {
      return { content: null, errorKind: 'http', errorMessage: data.error.message }
    }
    const content = data.choices?.[0]?.message?.content
    return { content: content || null }
  } catch (err) {
    const kind: LLMErrorKind = err instanceof DOMException && err.name === 'AbortError' ? 'timeout' : 'network'
    return { content: null, errorKind: kind, errorMessage: kind === 'timeout' ? '请求超时' : '网络异常' }
  } finally {
    clearTimeout(timer)
  }
}
