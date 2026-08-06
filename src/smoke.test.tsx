import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App', () => {
  it('渲染根节点', () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByTestId('month-view')).toBeInTheDocument()
  })
})
