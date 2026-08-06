import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: '日程' },
  { to: '/goals', label: '目标' },
  { to: '/list', label: '列表' },
  { to: '/settings', label: '设置' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-md">
        {items.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm ${isActive ? 'font-semibold text-indigo-600' : 'text-gray-500'}`}>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
