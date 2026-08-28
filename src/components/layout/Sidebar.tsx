import { NavLink, useLocation } from 'react-router-dom'

const items = [
  { to: '/', label: '对话' },
  { to: '/month', label: '日程' },
  { to: '/goals', label: '目标' },
  { to: '/list', label: '列表' },
  { to: '/settings', label: '设置' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const activeFor = (to: string) => pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <aside className="card-glass hidden w-60 shrink-0 flex-col md:flex">
      <div className="px-5 pb-4 pt-6">
        <h1 className="text-lg font-semibold tracking-tight">日规</h1>
        <p className="text-xs text-[var(--text-tertiary)]">日程与目标</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {items.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            aria-current={activeFor(to) ? 'page' : undefined}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
