import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LLMProvider } from './context/LLMContext'
import { registerServiceWorker } from './notify/register'
import { startForegroundScheduler } from './notify/foreground'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LLMProvider>
        <App />
      </LLMProvider>
    </BrowserRouter>
  </StrictMode>,
)
void registerServiceWorker()
startForegroundScheduler()
