import { Outlet, NavLink, Link } from 'react-router-dom'
import { Home, Settings, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-slate-100 shadow-sm px-4 py-3 flex items-center gap-2">
        <span className="text-xl">✈️</span>
        <span className="text-lg font-bold tracking-tight text-slate-900">Min Resa</span>
        <span className="flex-1" />
        <button
          onClick={logout}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Logga ut
        </button>
      </header>

      <main className="flex-1 overflow-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-end z-50">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Hem</span>
        </NavLink>

        <div className="flex-1 flex justify-center">
          <Link
            to="/ny"
            className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg -mt-5 mb-1 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-7 h-7 text-white" />
          </Link>
        </div>

        <NavLink
          to="/preferenser"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Preferenser</span>
        </NavLink>
      </nav>
    </div>
  )
}
