import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Map', to: '/' },
  { label: 'My Profile', to: '/profile' },
  { label: 'Settings', to: '/settings' },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between text-xs text-slate-400">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 font-semibold transition ${
                isActive ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
              }`
            }
            end
          >
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav
