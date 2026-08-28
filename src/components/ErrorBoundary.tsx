import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 全局错误兜底：子树渲染抛错时展示恢复 UI，避免整页白屏。
 * 不拦截事件处理器/异步错误（React 边界语义），配合各页内 try/catch 兜底。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] 捕获渲染错误:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div role="alert" className="card flex flex-col items-center gap-3 rounded-2xl px-6 py-12 text-center">
          <div className="text-3xl" aria-hidden="true">😵</div>
          <h1 className="text-lg font-semibold">出了点问题</h1>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">界面渲染遇到错误，请重新加载；数据仍保存在本机，不会丢失。</p>
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
