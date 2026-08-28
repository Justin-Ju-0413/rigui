import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Spinner from './components/Spinner'
import { useLiquidGlow } from './hooks/useLiquidGlow'

// 路由级分包：每个页面独立 chunk，首屏只加载对话页
const ChatView = lazy(() => import('./pages/ChatView'))
const MonthView = lazy(() => import('./pages/MonthView'))
const DayView = lazy(() => import('./pages/DayView'))
const WeekView = lazy(() => import('./pages/WeekView'))
const ListView = lazy(() => import('./pages/ListView'))
const GoalView = lazy(() => import('./pages/GoalView'))
const SettingsView = lazy(() => import('./pages/SettingsView'))

function RouteLoading() {
  return (
    <div data-testid="route-loading" className="card flex items-center justify-center rounded-2xl px-4 py-10">
      <Spinner />
    </div>
  )
}

export default function App() {
  useLiquidGlow()
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <div className="aurora-bg" aria-hidden="true" />
      <Sidebar />
      <main className="flex min-h-dvh flex-1 flex-col">
        <div className="flex-1 pb-36 md:pb-32">
          <div className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">
            <Suspense fallback={<RouteLoading />}>
              <Routes>
                <Route path="/" element={<ChatView />} />
                <Route path="/month" element={<MonthView />} />
                <Route path="/day" element={<DayView />} />
                <Route path="/week" element={<WeekView />} />
                <Route path="/list" element={<ListView />} />
                <Route path="/goals" element={<GoalView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
