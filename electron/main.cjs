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

  // 供 e2e 冒烟断言 handler 注册状态（ipcMain.handle 不计入 listenerCount）
  app.riguiHandlers = { notify: true, saveFile: true }

  createWindow()

  app.on('activate', () => {
    // macOS 惯例：点击 Dock 图标时若无窗口则重建
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
