import { describe, expect, it, afterEach, vi } from 'vitest'
import { chatCompletion, __setLLMTransport, type LLMConfig } from './client'

const config: LLMConfig = { baseUrl: 'https://api.example.com/v1', apiKey: 'sk-test', model: 'test-model' }

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })

describe('chatCompletion', () => {
  afterEach(() => { __setLLMTransport(fetch) })

  it('成功返回 content', async () => {
    __setLLMTransport(async (url, init) => {
      expect(String(url)).toBe('https://api.example.com/v1/chat/completions')
      const body = JSON.parse(String(init?.body))
      expect(body.model).toBe('test-model')
      expect(body.response_format).toEqual({ type: 'json_object' })
      return jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] })
    })
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }], { responseFormat: 'json_object' })
    expect(result.content).toBe('{"ok":true}')
    expect(result.errorKind).toBeUndefined()
  })

  it('401 映射为 config 错误', async () => {
    __setLLMTransport(async () => jsonResponse({ error: { message: 'bad key' } }, 401))
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.errorKind).toBe('config')
  })

  it('401 且 body 含 error.message 时透传真实原因(如余额不足)', async () => {
    __setLLMTransport(async () => jsonResponse({ error: { type: 'CreditsError', message: 'Insufficient balance' } }, 401))
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.errorKind).toBe('config')
    expect(result.errorMessage).toContain('Insufficient balance')
  })

  it('429 且 body 含 error.message 时透传', async () => {
    __setLLMTransport(async () => jsonResponse({ error: { message: 'Rate limit exceeded' } }, 429))
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.errorKind).toBe('http')
    expect(result.errorMessage).toContain('Rate limit exceeded')
  })

  it('网络异常映射为 network 错误', async () => {
    __setLLMTransport(async () => { throw new TypeError('Failed to fetch') })
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.errorKind).toBe('network')
  })

  it('缺少 API Key 映射为 config 错误', async () => {
    const result = await chatCompletion({ ...config, apiKey: '' }, [{ role: 'user', content: 'hi' }])
    expect(result.errorKind).toBe('config')
  })

  it('无内容返回 content null 不带错误', async () => {
    __setLLMTransport(async () => jsonResponse({ choices: [{ message: { content: '' } }] }))
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.content).toBeNull()
    expect(result.errorKind).toBeUndefined()
  })

  it('200 但 body 含 error 对象时透传服务端错误信息', async () => {
    __setLLMTransport(async () => jsonResponse({ error: { type: 'CreditsError', message: 'Insufficient balance' } }))
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.content).toBeNull()
    expect(result.errorKind).toBe('http')
    expect(result.errorMessage).toContain('Insufficient balance')
  })

  it('Electron 桥存在时经 llmChat 代理请求(绕开 CORS)', async () => {
    const llmChat = vi.fn().mockResolvedValue({ content: '{"ok":true}' })
    ;(window as unknown as { rigui?: unknown }).rigui = { isElectron: true, llmChat }
    try {
      const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }], { responseFormat: 'json_object' })
      expect(llmChat).toHaveBeenCalledTimes(1)
      expect(llmChat.mock.calls[0][0]).toMatchObject({ baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model, responseFormat: 'json_object' })
      expect(result.content).toBe('{"ok":true}')
      expect(result.errorKind).toBeUndefined()
    } finally {
      delete (window as unknown as { rigui?: unknown }).rigui
    }
  })

  it('Electron 桥代理返回错误时透传', async () => {
    const llmChat = vi.fn().mockResolvedValue({ content: null, errorKind: 'http', errorMessage: 'Insufficient balance' })
    ;(window as unknown as { rigui?: unknown }).rigui = { isElectron: true, llmChat }
    try {
      const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
      expect(result.errorKind).toBe('http')
      expect(result.errorMessage).toContain('Insufficient balance')
    } finally {
      delete (window as unknown as { rigui?: unknown }).rigui
    }
  })
})
