import { Navigate, createBrowserRouter } from 'react-router-dom'

import { RoutePlaceholder } from '../../components/layout/route-placeholder'
import { AppShell } from '../../pages/app-shell'
import { NotFoundPage } from '../../pages/not-found'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <RoutePlaceholder label="Login" />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/people" replace /> },
      { path: 'people', element: <RoutePlaceholder label="People" /> },
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
