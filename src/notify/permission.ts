export async function ensureNotificationPermission(): Promise<void> {
  // Electron 下权限默认已授予，无需请求
  if (window.rigui?.isElectron) return
  if (!('Notification' in window) || Notification.permission !== 'default') return
  try { await Notification.requestPermission() } catch { /* 用户拒绝或环境不支持时静默 */ }
}
