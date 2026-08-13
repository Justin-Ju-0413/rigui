// npm run dev:app —— 同时启动 vite dev server 与 Electron（零额外依赖）
import { spawn } from 'node:child_process'
import process from 'node:process'

const PORT = 5173
const URL = `http://localhost:${PORT}`

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* 未就绪，继续轮询 */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`vite dev server ${url} 未在 ${timeoutMs}ms 内就绪`)
}

let electron = null
try {
  await waitForServer(URL)
  electron = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_DEV_SERVER_URL: URL },
  })
} catch (err) {
  console.error(err.message)
  vite.kill()
  process.exit(1)
}

function shutdown(signal) {
  if (electron) electron.kill(signal)
  vite.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
// Electron 退出（含窗口全部关闭）时结束 vite
electron.on('exit', () => {
  vite.kill()
  process.exit(0)
})
