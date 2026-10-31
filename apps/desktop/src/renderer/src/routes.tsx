import { createHashRouter, Navigate, Outlet } from 'react-router'

import { GuestOnly, RequireAuth } from './components/auth-guard'
import RouteError from './components/route-error'
import Desk from './pages/desk'
import Expenses from './pages/expenses'
import Journal from './pages/journal'
import Login from './pages/login'
import Measure from './pages/measure'
import Register from './pages/register'
import Stats from './pages/stats'

export const router = createHashRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
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
          { path: '/stats', element: <Stats /> },
          { path: '/measure', element: <Measure /> }
        ]
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
