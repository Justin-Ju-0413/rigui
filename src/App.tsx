import { Route, Routes } from 'react-router-dom'
import BottomNav from './components/layout/BottomNav'
import MonthView from './pages/MonthView'
import DayView from './pages/DayView'
import WeekView from './pages/WeekView'
import ListView from './pages/ListView'
import GoalView from './pages/GoalView'
import SettingsView from './pages/SettingsView'

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<MonthView />} />
          <Route path="/day" element={<DayView />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/list" element={<ListView />} />
          <Route path="/goals" element={<GoalView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
