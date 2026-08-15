// 日规桌面端 preload：以最小面暴露 IPC 桥，contextIsolation 保持开启
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('rigui', {
  isElectron: true,
  notify: (title, body) => ipcRenderer.send('notify', title, body),
  saveFile: (defaultName, content) => ipcRenderer.invoke('save-file', defaultName, content),
  llmChat: (req) => ipcRenderer.invoke('llm-chat', req),
})
