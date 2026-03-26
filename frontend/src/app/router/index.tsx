import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AuthGuard } from '../../features/auth/components/AuthGuard'
import { LoginPage } from '../../features/auth/routes/LoginPage'
import { PersonDetailPage } from '../../features/people/routes/PersonDetailPage'
import { PersonFormPage } from '../../features/people/routes/PersonFormPage'
import { PeopleListPage } from '../../features/people/routes/PeopleListPage'
import { RoutePlaceholder } from '../../components/layout/route-placeholder'
import { AppShell } from '../../pages/app-shell'
import { NotFoundPage } from '../../pages/not-found'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/people" replace /> },
      { path: 'people', element: <PeopleListPage /> },
      { path: 'people/new', element: <PersonFormPage /> },
      { path: 'people/:personId', element: <PersonDetailPage /> },
      { path: 'people/:personId/edit', element: <PersonFormPage /> },
      { path: 'journal', element: <RoutePlaceholder label="Journal" /> },
      { path: 'almanac', element: <RoutePlaceholder label="Almanac" /> },
      { path: 'reminders', element: <RoutePlaceholder label="Reminders" /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
