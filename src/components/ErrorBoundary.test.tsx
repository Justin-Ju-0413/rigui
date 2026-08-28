import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

function Boom(): never {
  throw new Error('渲染炸了')
}

describe('ErrorBoundary', () => {
  it('子组件渲染抛错时展示兜底 UI 而非白屏', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/出了点问题/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重新加载/ })).toBeInTheDocument()
    expect(screen.queryByText('渲染炸了')).not.toBeInTheDocument()
    spy.mockRestore()
  })

  it('正常子组件不受影响', () => {
    render(
      <ErrorBoundary>
        <div data-testid="ok">正常内容</div>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('ok')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
