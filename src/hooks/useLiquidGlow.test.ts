import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLiquidGlow } from './useLiquidGlow'

/** 手动队列式 rAF：测试可控制何时应用帧 */
let rafQueue: Array<() => void>
function stubRafQueue() {
  rafQueue = []
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    rafQueue.push(cb)
    return rafQueue.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

const rootStyle = () => document.documentElement.style
const firePointerMove = (x: number, y: number) =>
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }))

describe('useLiquidGlow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('style')
  })

  it('pointermove 后经 rAF 把指针比例写入 --lx/--ly', () => {
    stubRafQueue()
    stubReducedMotion(false)
    renderHook(() => useLiquidGlow())

    firePointerMove(window.innerWidth / 2, window.innerHeight / 2)
    expect(rootStyle().getPropertyValue('--lx')).toBe('')
    expect(rafQueue).toHaveLength(1)

    rafQueue[0]()
    expect(rootStyle().getPropertyValue('--lx')).toBe('0.5000')
    expect(rootStyle().getPropertyValue('--ly')).toBe('0.5000')
  })

  it('连续 pointermove 只调度一次 rAF（节流）', () => {
    stubRafQueue()
    stubReducedMotion(false)
    renderHook(() => useLiquidGlow())

    firePointerMove(100, 100)
    firePointerMove(200, 200)
    expect(rafQueue).toHaveLength(1)
  })

  it('prefers-reduced-motion 时不写入 CSS 变量', () => {
    stubRafQueue()
    stubReducedMotion(true)
    renderHook(() => useLiquidGlow())

    firePointerMove(100, 100)
    expect(rafQueue).toHaveLength(0)
    expect(rootStyle().getPropertyValue('--lx')).toBe('')
  })

  it('挂载时在根元素添加 lg-active 激活标记，卸载后移除', () => {
    stubRafQueue()
    stubReducedMotion(false)
    const { unmount } = renderHook(() => useLiquidGlow())

    expect(document.documentElement.classList.contains('lg-active')).toBe(true)

    unmount()
    expect(document.documentElement.classList.contains('lg-active')).toBe(false)
  })

  it('卸载后移除监听，不再写入 CSS 变量', () => {
    stubRafQueue()
    stubReducedMotion(false)
    const { unmount } = renderHook(() => useLiquidGlow())
    unmount()

    firePointerMove(100, 100)
    expect(rafQueue).toHaveLength(0)
    expect(rootStyle().getPropertyValue('--lx')).toBe('')
  })
})
