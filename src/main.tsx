import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LLMProvider } from './context/LLMContext'
import { registerServiceWorker } from './notify/register'
import { startForegroundScheduler } from './notify/foreground'

// 浏览器（PWA）保持路径路由；Electron 以 file:// 加载，需 hash 路由保证刷新/深链可用
const Router = window.rigui?.isElectron ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <LLMProvider>
        <App />
      </LLMProvider>
    </Router>
  </StrictMode>,
)
void registerServiceWorker()
startForegroundScheduler()
