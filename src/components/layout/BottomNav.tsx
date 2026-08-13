import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: '日程' },
  { to: '/goals', label: '目标' },
  { to: '/list', label: '列表' },
  { to: '/settings', label: '设置' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-4 pb-5 md:hidden">
      <div className="card-glass mx-auto flex max-w-md rounded-[28px] p-1.5 md:max-w-xl">
        {items.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 rounded-2xl py-2.5 text-center text-sm transition-colors ${isActive ? 'nav-active font-semibold' : 'text-[var(--text-secondary)]'}`}>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
