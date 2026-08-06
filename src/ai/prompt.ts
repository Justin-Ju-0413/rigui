export function buildParsePrompt(input: string, now: string, recentEvents: string[]): { system: string; user: string } {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const system = [
    '你是一个日程解析助手。把用户的自然语言输入解析为结构化日程 JSON。',
    `当前时间：${now}，时区：${tz}。`,
    '必须输出 JSON，字段：title(必填,字符串), startTime(必填,ISO8601 本地时间字符串如 2026-08-11T15:00:00), endTime(可选), allDay(可选,布尔), location(可选,字符串), reminderOffsets(可选,分钟数组), repeat(可选,取 "none"|"daily"|"weekly"|"monthly",默认 "none")。',
    '相对时间（如"下周二"）基于当前时间计算。时间未指定时默认为 09:00，时长默认 1 小时。',
    '近期已有日程（用于消歧"那个会"）：',
    ...recentEvents.map(e => `- ${e}`),
  ].join('\n')
  return { system, user: input }
}
