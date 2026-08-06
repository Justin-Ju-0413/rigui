export async function ensureNotificationPermission(): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'default') return
  try { await Notification.requestPermission() } catch { /* 用户拒绝或环境不支持时静默 */ }
}
