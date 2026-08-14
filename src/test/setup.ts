import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// 单测环境不加载 .env.local 的 LLM 默认值（保持「未配置」初始状态）
const testEnv = import.meta.env as { VITE_LLM_BASE_URL?: string; VITE_LLM_MODEL?: string; VITE_LLM_API_KEY?: string }
testEnv.VITE_LLM_BASE_URL = ''
testEnv.VITE_LLM_MODEL = ''
testEnv.VITE_LLM_API_KEY = ''

// jsdom 无 matchMedia：默认「非 reduced-motion」，供 useLiquidGlow 等使用
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

afterEach(cleanup)
