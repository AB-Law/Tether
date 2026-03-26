import { NavLink, Outlet } from 'react-router-dom'

import { tokenStore } from '../lib/api-client'

const navLinks = [
  { to: '/people', label: 'People' },
  { to: '/journal', label: 'Journal' },
  { to: '/almanac', label: 'Almanac' },
  { to: '/reminders', label: 'Reminders' },
]

export function AppShell() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-6 py-6">
            <h1 className="text-2xl font-semibold tracking-tight text-blue-700">Tether</h1>
            <p className="text-xs text-slate-500">Relationship Tracking</p>
          </div>
          <nav className="space-y-1 px-3 py-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) =>
                  isActive
                    ? 'flex rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700'
                    : 'flex rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-100 px-4 py-4">
            <button
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                tokenStore.set(null)
                globalThis.location.assign('/login')
              }}
              type="button"
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Back to People</p>
              <div className="flex items-center gap-3 text-slate-500">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200">?</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200">⚙</span>
              </div>
            </div>
          </header>
          <section className="px-5 py-6">
            <Outlet />
          </section>
        </div>
      </div>
    </main>
  )
}
