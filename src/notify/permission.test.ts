import { describe, expect, it } from 'vitest'
import { ensureNotificationPermission } from './permission'

describe('ensureNotificationPermission', () => {
  it('permission 非 default 时不请求', async () => {
    let requested = false
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted', requestPermission: () => { requested = true } },
      configurable: true,
    })
    await ensureNotificationPermission()
    expect(requested).toBe(false)
  })

  it('permission 为 default 时请求', async () => {
    let requested = false
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default', requestPermission: () => { requested = true } },
      configurable: true,
    })
    await ensureNotificationPermission()
    expect(requested).toBe(true)
  })
})
