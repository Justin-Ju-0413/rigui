// 日规桌面端主进程（CJS，避免 ESM 打包链路）
const { app, BrowserWindow, ipcMain, Notification, dialog, session } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// 单实例：重复启动时聚焦已有窗口
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    title: '日规 rigui',
    backgroundColor: '#faf9f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (DEV_SERVER_URL) {
    void win.loadURL(DEV_SERVER_URL)
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
  return win
}

app.whenReady().then(() => {
  // 兜底放行通知权限（Electron 渲染进程默认已授予，这里显式声明）
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'notifications')
  })

  // 渲染进程轮询到期后走系统通知；点击通知聚焦窗口（替代浏览器 SW notificationclick）
  ipcMain.on('notify', (_event, title, body) => {
    if (!Notification.isSupported()) return
    const n = new Notification({ title: String(title), body: String(body) })
    n.on('click', () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })
    n.show()
  })

  // ICS / JSON 导出：弹系统保存对话框，避免直接落到下载目录
  ipcMain.handle('save-file', async (_event, defaultName, content) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: path.join(app.getPath('downloads'), String(defaultName)),
    })
    if (canceled || !filePath) return { canceled: true, path: null }
    await fs.promises.writeFile(filePath, String(content), 'utf8')
    return { canceled: false, path: filePath }
  })

  // LLM 代理：renderer fetch 受 CORS 限制（第三方端点常不放行），main 进程 Node fetch 无此限制。
  // 与 src/llm/client.ts 的解析逻辑保持一致。
  ipcMain.handle('llm-chat', async (_event, req) => {
    const { baseUrl, apiKey, model, messages, temperature, responseFormat, maxTokens, timeoutMs } = req ?? {}
    if (!apiKey) return { content: null, errorKind: 'config', errorMessage: '未配置 API Key' }
    if (!baseUrl) return { content: null, errorKind: 'config', errorMessage: '未配置 API 地址' }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? 30000)
    const url = `${String(baseUrl).replace(/\/$/, '')}/chat/completions`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature ?? 0.3,
          ...(responseFormat ? { response_format: { type: 'json_object' } } : {}),
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const kind = res.status === 401 || res.status === 403 ? 'config' : 'http'
        const message = data?.error?.message
          ?? (res.status === 401 || res.status === 403 ? 'API Key 无效'
            : res.status === 429 ? '请求过于频繁'
              : res.status === 404 ? '模型或接口不存在'
                : `服务端错误 (${res.status})`)
        return { content: null, errorKind: kind, errorMessage: message }
      }
      // 部分端点 200 时也返回 { error } 对象（如余额不足），透传真实原因
      if (data?.error?.message) return { content: null, errorKind: 'http', errorMessage: data.error.message }
      return { content: data?.choices?.[0]?.message?.content ?? null }
    } catch (err) {
      const timeout = err instanceof Error && err.name === 'AbortError'
      return { content: null, errorKind: timeout ? 'timeout' : 'network', errorMessage: timeout ? '请求超时' : '网络异常' }
    } finally {
      clearTimeout(timer)
    }
  })

  // 供 e2e 冒烟断言 handler 注册状态（ipcMain.handle 不计入 listenerCount）
  app.riguiHandlers = { notify: true, saveFile: true, llmChat: true }

  createWindow()

  app.on('activate', () => {
    // macOS 惯例：点击 Dock 图标时若无窗口则重建
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
