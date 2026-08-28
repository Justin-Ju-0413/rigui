import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

// 预缓存构建产出的 app-shell 清单（vite-plugin-pwa 构建时注入 __WB_MANIFEST）
// 使得「添加到主屏幕」后断网也能打开应用壳；静态资源走 precache 命中，无需额外 fetch 策略
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 即时接管（配合 registerType: 'autoUpdate'）
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

// SPA 导航回退：任意路由（含刷新/深链）命中预缓存的 index.html
// /llm 为开发期 LLM 反代，保持网络直连，不做导航拦截
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\/(llm|api)\//],
  }),
)

// 通知点击：聚焦已有窗口，否则打开首页
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clients) => {
    const client = clients.find((c) => 'focus' in c) ?? clients[0]
    if (client) return client.focus()
    return self.clients.openWindow('/')
  }))
})
