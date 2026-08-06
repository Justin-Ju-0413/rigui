import { describe, expect, it, afterEach } from 'vitest'
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

  it('429 映射为额度错误', async () => {
    __setLLMTransport(async () => jsonResponse({}, 429))
    const result = await chatCompletion(config, [{ role: 'user', content: 'hi' }])
    expect(result.errorKind).toBe('http')
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
})
