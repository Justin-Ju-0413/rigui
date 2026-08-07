import { Route, Routes } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import MonthView from './pages/MonthView'
import DayView from './pages/DayView'
import WeekView from './pages/WeekView'
import ListView from './pages/ListView'
import GoalView from './pages/GoalView'
import SettingsView from './pages/SettingsView'
import AIInputPanel from './components/AIInputPanel'

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col sm:max-w-3xl md:max-w-5xl lg:max-w-6xl">
      <div className="aurora-bg" aria-hidden="true" />
      <main className="flex-1 pb-32 md:pb-10 md:pt-20 lg:pt-24">
        <Routes>
          <Route path="/" element={<MonthView />} />
          <Route path="/day" element={<DayView />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/goals" element={<GoalView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
        <AIInputPanel />
      </main>
      <BottomNav />
    </div>
  )
}
