// 桌面端冒烟：Electron 启动、渲染、preload IPC 桥、主进程通道
import { test, expect, _electron as electron } from '@playwright/test'

test('Electron 应用启动、渲染与 IPC 桥可用', async () => {
  const app = await electron.launch({ args: ['.'] })
  const win = await app.firstWindow()
  await expect(win).toHaveTitle(/日规/)

  // preload 桥注入
  const bridge = await win.evaluate(() => ({
    isElectron: window.rigui?.isElectron ?? false,
    notify: typeof window.rigui?.notify === 'function',
    saveFile: typeof window.rigui?.saveFile === 'function',
  }))
  expect(bridge).toEqual({ isElectron: true, notify: true, saveFile: true })

  // 主进程 IPC 通道已注册（通知为 on 监听器；save-file 为 handle，经 app.riguiHandlers 标记查询）
  const handlers = await app.evaluate(({ app, ipcMain }) => ({
    notify: ipcMain.listenerCount('notify'),
    saveFile: app.riguiHandlers?.saveFile === true,
  }))
  expect(handlers).toEqual({ notify: 1, saveFile: true })

  // HashRouter 导航可用、不白屏
  await win.evaluate(() => { window.location.hash = '#/settings' })
  await expect(win.locator('#root')).not.toBeEmpty()

  await app.close()
})
