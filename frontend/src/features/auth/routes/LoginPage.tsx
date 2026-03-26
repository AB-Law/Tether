import { useState } from 'react'

import { useLogin } from '../hooks/useLogin'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()

  const onSubmit: NonNullable<React.ComponentProps<'form'>['onSubmit']> = (event) => {
    event.preventDefault()
    void login.mutateAsync({ email, password })
  }

  return (
    <main className="flex min-h-screen flex-col bg-[linear-gradient(100deg,#f8fafc_0%,#f3f6fb_55%,#eef4ff_100%)]">
      <section className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600 shadow-sm">
            ✣
          </div>
          <h1 className="text-center text-5xl font-semibold tracking-tight text-slate-900">Welcome back to your circle</h1>
          <p className="mt-2 text-center text-sm text-slate-500">Reconnecting with those who matter.</p>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block text-sm" htmlFor="email">
                <span className="mb-1.5 block font-medium text-slate-700">Email Address</span>
                <input
                  id="email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="alex@example.com"
                  type="email"
                  value={email}
                />
              </label>

              <div className="block text-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-medium text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <button className="text-xs text-blue-600 hover:underline" type="button">
                    Forgot Password?
                  </button>
                </div>
                <input
                  id="password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                />
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <input className="h-4 w-4 rounded border-slate-300" id="stay-signed-in" type="checkbox" />
                <label htmlFor="stay-signed-in">Stay signed in</label>
              </div>

              {login.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Unable to sign in. Check your credentials and try again.
                </p>
              ) : null}

              <button
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                disabled={login.isPending}
                type="submit"
              >
                {login.isPending ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              New to Tether?{' '}
              <button className="font-medium text-blue-700 hover:underline" type="button">
                Create an Account
              </button>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span>Securedly Encrypted</span>
            <span>Focus on Connection</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span>© 2024 Tether. Keeping connections warm.</span>
          <div className="flex gap-5">
            <button className="hover:text-slate-700" type="button">
              Privacy Policy
            </button>
            <button className="hover:text-slate-700" type="button">
              Terms of Service
            </button>
            <button className="hover:text-slate-700" type="button">
              Support
            </button>
          </div>
        </div>
      </footer>
    </main>
  )
}
