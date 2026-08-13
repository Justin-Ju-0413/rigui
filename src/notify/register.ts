export async function registerServiceWorker(): Promise<void> {
  // Electron 下无 SW 概念（通知由主进程系统通知承担），直接跳过
  if (window.rigui?.isElectron) return
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    console.error('SW 注册失败', e)
  }
}
