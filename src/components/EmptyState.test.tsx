import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('渲染标题与说明', () => {
    render(<EmptyState title="暂无日程" detail="点击右下角 + 新建" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('暂无日程')).toBeInTheDocument()
    expect(screen.getByText('点击右下角 + 新建')).toBeInTheDocument()
  })

  it('可选动作渲染在卡片内', () => {
    render(<EmptyState title="还没有目标" action={<button type="button">新建目标</button>} />)
    expect(screen.getByRole('button', { name: '新建目标' })).toBeInTheDocument()
  })

  it('无 detail 时不渲染说明', () => {
    render(<EmptyState title="空" />)
    expect(screen.getByText('空')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-state-detail')).not.toBeInTheDocument()
  })
})
