import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <Link className="text-blue-600 hover:underline" to="/">
        Go back home
      </Link>
    </main>
  )
}
