import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import ChatView from './pages/ChatView'
import MonthView from './pages/MonthView'
import DayView from './pages/DayView'
import WeekView from './pages/WeekView'
import ListView from './pages/ListView'
import GoalView from './pages/GoalView'
import SettingsView from './pages/SettingsView'
import { useLiquidGlow } from './hooks/useLiquidGlow'

export default function App() {
  useLiquidGlow()
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <div className="aurora-bg" aria-hidden="true" />
      <Sidebar />
      <main className="flex min-h-dvh flex-1 flex-col">
        <div className="flex-1 pb-36 md:pb-32">
          <div className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">
            <Routes>
              <Route path="/" element={<ChatView />} />
              <Route path="/month" element={<MonthView />} />
              <Route path="/day" element={<DayView />} />
              <Route path="/week" element={<WeekView />} />
              <Route path="/list" element={<ListView />} />
              <Route path="/goals" element={<GoalView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
