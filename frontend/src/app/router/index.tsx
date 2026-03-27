import { Navigate, createBrowserRouter } from 'react-router-dom'

import { AuthGuard } from '../../features/auth/components/AuthGuard'
import { AlmanacEditorPage } from '../../features/almanac/routes/AlmanacEditorPage'
import { AlmanacEntryPage } from '../../features/almanac/routes/AlmanacEntryPage'
import { AlmanacPage } from '../../features/almanac/routes/AlmanacPage'
import { JournalEditorPage } from '../../features/journal/routes/JournalEditorPage'
import { JournalEntryPage } from '../../features/journal/routes/JournalEntryPage'
import { JournalListPage } from '../../features/journal/routes/JournalListPage'
import { LoginPage } from '../../features/auth/routes/LoginPage'
import { PersonDetailPage } from '../../features/people/routes/PersonDetailPage'
import { PersonFormPage } from '../../features/people/routes/PersonFormPage'
import { PeopleListPage } from '../../features/people/routes/PeopleListPage'
import { RemindersPage } from '../../features/reminders/routes/RemindersPage'
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
      { index: true, element: <Navigate to="/journal" replace /> },
      { path: 'people', element: <PeopleListPage /> },
      { path: 'people/new', element: <PersonFormPage /> },
      { path: 'people/:personId', element: <PersonDetailPage /> },
      { path: 'people/:personId/edit', element: <PersonFormPage /> },
      { path: 'journal', element: <JournalListPage /> },
      { path: 'journal/new', element: <JournalEditorPage /> },
      { path: 'journal/:entryId', element: <JournalEntryPage /> },
      { path: 'journal/:entryId/edit', element: <JournalEditorPage /> },
      { path: 'almanac', element: <AlmanacPage /> },
      { path: 'almanac/new', element: <AlmanacEditorPage /> },
      { path: 'almanac/:entryId', element: <AlmanacEntryPage /> },
      { path: 'reminders', element: <RemindersPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
