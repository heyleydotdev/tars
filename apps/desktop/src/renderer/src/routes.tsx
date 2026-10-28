import { createHashRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from './components/auth-guard'
import Agent from './pages/agent'
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
    children: [{ path: '/', element: <Agent /> }]
  },
  { path: '*', element: <Navigate to="/" replace /> }
])
