export async function registerServiceWorker(): Promise<void> {
  // 开发期不注册：public/sw.js 含 workbox import，dev 下浏览器无法解析裸模块路径，
  // 且 dev SW 缓存会造成陈旧模块问题。Electron 下无 SW 概念（通知走主进程）。
  if (import.meta.env.DEV || window.rigui?.isElectron) return
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.error('SW 注册失败', e)
  }
}
