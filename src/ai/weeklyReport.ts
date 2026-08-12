import { chatCompletion } from '../llm/client'
import type { LLMConfig } from '../llm/types'
import type { ReportStats } from '../stats/report'

export type WeeklyReportResult =
  | { ok: true; content: string }
  | { ok: false; errors: string[] }

export function buildReportPrompt(stats: ReportStats, weekRangeLabel: string): { system: string; user: string } {
  const system = [
    '你是一个日程分析助手。根据给定的结构化统计 JSON 生成中文周报。',
    '要求：',
    '1. 客观转述统计数据，绝不编造统计中没有的数据；',
    '2. 按四节组织：概览 / 目标进度 / 时间与空闲 / 下周建议；',
    '3. 总字数控制在 200 字以内；',
    '4. 只输出周报正文纯文本，不要输出 JSON 或 markdown 代码块。',
  ].join('\n')
  const user = [
    `周范围：${weekRangeLabel}`,
    `统计 JSON：`,
    JSON.stringify(stats),
  ].join('\n')
  return { system, user }
}

export async function generateWeeklyReport(
  config: LLMConfig,
  stats: ReportStats,
  weekRangeLabel: string,
): Promise<WeeklyReportResult> {
  const { system, user } = buildReportPrompt(stats, weekRangeLabel)
  const result = await chatCompletion(config, [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { temperature: 0.4 })
  if (result.content) return { ok: true, content: result.content }
  return { ok: false, errors: [result.errorMessage ?? 'AI 分析失败'] }
}
