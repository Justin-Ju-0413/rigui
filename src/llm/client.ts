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
      return { content: null, errorKind: kind, errorMessage: errorMessage(res.status) }
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    return { content: content || null }
  } catch (err) {
    const kind: LLMErrorKind = err instanceof DOMException && err.name === 'AbortError' ? 'timeout' : 'network'
    return { content: null, errorKind: kind, errorMessage: kind === 'timeout' ? '请求超时' : '网络异常' }
  } finally {
    clearTimeout(timer)
  }
}
