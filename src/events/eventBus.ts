type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeEventsChanged(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function notifyEventsChanged(): void {
  for (const fn of [...listeners]) fn()
}
