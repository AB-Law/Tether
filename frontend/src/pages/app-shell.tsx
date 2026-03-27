import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useQuickCaptureStore } from '../app/store/quickCapture'
import { QuickCapturePanel } from '../features/almanac/components/QuickCapturePanel'
import { tokenStore } from '../lib/api-client'

const navLinks = [
  { to: '/journal', label: 'Journal' },
  { to: '/people', label: 'People' },
  { to: '/almanac', label: 'Almanac' },
  { to: '/reminders', label: 'Reminders' },
]

export function AppShell() {
  const toggleQuickCapture = useQuickCaptureStore((state) => state.toggle)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target =
        (event.target as HTMLElement | null) ??
        (document.activeElement as HTMLElement | null)
      const isEditableTarget =
        !!target &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'OPTION')

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (isEditableTarget) return
        event.preventDefault()
        toggleQuickCapture()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [toggleQuickCapture])

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-100 px-6 py-6">
            <h1 className="text-2xl font-black tracking-tight text-blue-600">Tether</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Relationship Tracking</p>
          </div>
          <nav className="space-y-1 px-3 py-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) =>
                  isActive
                    ? 'flex rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700'
                    : 'flex rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-100 px-4 py-4">
            <button
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
          <header className="border-b border-slate-200 bg-slate-50 px-6 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-md">
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Search entries, people, or tags..."
                  type="text"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  onClick={toggleQuickCapture}
                  type="button"
                >
                  Capture
                </button>
                <button
                  aria-label="Notifications"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0" />
                  </svg>
                </button>
                <button
                  aria-label="Settings"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M10.3 3.7h3.4l.5 2.1a6.9 6.9 0 0 1 1.5.9l2-.8 1.7 2.9-1.6 1.3a7.5 7.5 0 0 1 0 1.8l1.6 1.3-1.7 2.9-2-.8a6.9 6.9 0 0 1-1.5.9l-.5 2.1h-3.4l-.5-2.1a6.9 6.9 0 0 1-1.5-.9l-2 .8-1.7-2.9 1.6-1.3a7.5 7.5 0 0 1 0-1.8L4.9 8.8 6.6 6l2 .8a6.9 6.9 0 0 1 1.5-.9l.2-2.2ZM12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
                  </svg>
                </button>
              </div>
            </div>
          </header>
          <section className="px-6 py-6">
            <Outlet />
          </section>
        </div>
      </div>
      <QuickCapturePanel />
    </main>
  )
}
