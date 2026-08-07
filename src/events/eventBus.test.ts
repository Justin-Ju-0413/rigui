import { describe, expect, it, vi } from 'vitest'
import { notifyEventsChanged, subscribeEventsChanged } from './eventBus'

describe('eventBus', () => {
  it('subscribe 后 notify 调用监听器', () => {
    const fn = vi.fn()
    subscribeEventsChanged(fn)
    notifyEventsChanged()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe 后 notify 不再调用', () => {
    const fn = vi.fn()
    const unsubscribe = subscribeEventsChanged(fn)
    unsubscribe()
    notifyEventsChanged()
    expect(fn).not.toHaveBeenCalled()
  })
})
