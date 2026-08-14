import { useEffect } from 'react'

/**
 * 液态玻璃动态光泽：全局监听 pointermove（桌面鼠标/移动端触摸滑动统一走 PointerEvent），
 * 经 rAF 节流把指针位置比例写入根元素 CSS 变量 --lx/--ly，
 * 玻璃层的光斑渐变据此跟随移动。
 * prefers-reduced-motion 时完全不监听，保持零开销。
 */
export function useLiquidGlow(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    root.classList.add('lg-active')
    let rafId = 0
    let px = 0.5
    let py = 0.2
    const apply = () => {
      rafId = 0
      root.style.setProperty('--lx', px.toFixed(4))
      root.style.setProperty('--ly', py.toFixed(4))
    }
    const onMove = (e: PointerEvent) => {
      px = e.clientX / window.innerWidth
      py = e.clientY / window.innerHeight
      if (!rafId) rafId = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      root.classList.remove('lg-active')
      window.removeEventListener('pointermove', onMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])
}
