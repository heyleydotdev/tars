import { createHashRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from './components/auth-guard'
import Dashboard from './pages/dashboard'
import Login from './pages/login'
import Register from './pages/register'

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
    children: [{ path: '/', element: <Dashboard /> }]
  },
  { path: '*', element: <Navigate to="/" replace /> }
])
