/** 统一加载指示：role=status 供读屏播报，动画遵循 prefers-reduced-motion（CSS 内处理） */
export default function Spinner({ label = '加载中…' }: { label?: string } = {}) {
  return (
    <span data-testid="spinner" role="status" className="flex items-center gap-1.5">
      <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      <span>{label}</span>
    </span>
  )
}
