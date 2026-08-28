import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('渲染加载指示（role=status + 文本）', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('spinner')).toHaveTextContent('加载中…')
  })
})
