/// <reference types="vite/client" />

// .env.local 注入的 LLM 默认配置（未入库，仅本机构建时生效）
interface ImportMetaEnv {
  readonly VITE_LLM_BASE_URL?: string
  readonly VITE_LLM_MODEL?: string
  readonly VITE_LLM_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
