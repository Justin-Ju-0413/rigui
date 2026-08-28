import type { ReactNode } from 'react'

interface Props {
  title: string
  detail?: string
  action?: ReactNode
}

/** 统一空态卡片：标题 + 可选说明 + 可选动作（role=status 供读屏播报） */
export default function EmptyState({ title, detail, action }: Props) {
  return (
    <div role="status" className="card flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden="true">🗓️</div>
      <p className="text-base font-semibold">{title}</p>
      {detail && <p data-testid="empty-state-detail" className="max-w-sm text-sm text-[var(--text-secondary)]">{detail}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
