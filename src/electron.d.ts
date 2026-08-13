// Electron preload 注入的桥（浏览器环境下 window.rigui 为 undefined）
interface RiguiBridge {
  isElectron: true
  notify(title: string, body: string): void
  saveFile(defaultName: string, content: string): Promise<{ canceled: boolean; path: string | null }>
}

interface Window {
  rigui?: RiguiBridge
}
