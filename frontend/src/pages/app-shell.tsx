import { NavLink, Outlet } from 'react-router-dom'

const navLinks = [
  { to: '/people', label: 'People' },
  { to: '/journal', label: 'Journal' },
  { to: '/almanac', label: 'Almanac' },
]

export function AppShell() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <h1 className="text-lg font-semibold">Tether</h1>
          <nav className="flex items-center gap-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </section>
    </main>
  )
}
