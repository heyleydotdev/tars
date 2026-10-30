import { createHashRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from './components/auth-guard'
import Desk from './pages/desk'
import Expenses from './pages/expenses'
import Journal from './pages/journal'
import Login from './pages/login'
import Register from './pages/register'
import Stats from './pages/stats'

export const router = createHashRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> }
    ]
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <Desk /> },
      { path: '/journal', element: <Journal /> },
      { path: '/expenses', element: <Expenses /> },
      { path: '/stats', element: <Stats /> }
    ]
  },
  { path: '*', element: <Navigate to="/" replace /> }
])
