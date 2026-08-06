import { chatCompletion } from '../llm/client'
import type { LLMConfig } from '../llm/types'
import { buildParsePrompt } from './prompt'
import { validateParsedEvent, type ValidateResult } from './schema'

export { validateParsedEvent } from './schema'
export type { ParsedEventInput } from './schema'

function tryParseJson(content: string): unknown {
  try { return JSON.parse(content) } catch { return null }
}

export async function parseEventToInput(
  config: LLMConfig,
  input: string,
  now: string,
  recentEvents: string[],
): Promise<ValidateResult> {
  const attempt = async (extraHint?: string): Promise<ValidateResult> => {
    const { system, user } = buildParsePrompt(input, now, recentEvents)
    const messages = [
      { role: 'system' as const, content: extraHint ? `${system}\n上次输出的问题：${extraHint}` : system },
      { role: 'user' as const, content: user },
    ]
    const result = await chatCompletion(config, messages, { responseFormat: 'json_object', temperature: 0.1, maxTokens: 600 })
    if (result.errorKind) return { ok: false, errors: [`LLM: ${result.errorMessage ?? result.errorKind}`] }
    if (result.content === null) return { ok: false, errors: ['LLM 未返回内容'] }
    return validateParsedEvent(tryParseJson(result.content))
  }

  const first = await attempt()
  if (first.ok || first.errors.some(e => e.startsWith('LLM'))) return first
  const second = await attempt(first.errors.join('；'))
  return second
}
