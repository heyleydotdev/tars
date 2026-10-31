import type { QueryClient } from '@tanstack/react-query'
import { createHashRouter, Navigate, Outlet } from 'react-router'

import { GuestOnly, RequireAuth } from './components/auth-guard'
import DashboardLayout from './components/dashboard-layout'
import LoadingScreen from './components/loading-screen'
import RouteError from './components/route-error'
import {
  expensesLoader,
  incidentLoader,
  incidentsLoader,
  journalLoader,
  measureLoader,
  statsLoader
} from './lib/loaders'
import Desk from './pages/desk'
import Expenses from './pages/expenses'
import Incident from './pages/incident'
import Incidents from './pages/incidents'
import Journal from './pages/journal'
import Login from './pages/login'
import Measure from './pages/measure'
import Register from './pages/register'
import Stats from './pages/stats'

export function createAppRouter(queryClient: QueryClient) {
  return createHashRouter([
    {
      element: <Outlet />,
      errorElement: <RouteError />,
      HydrateFallback: LoadingScreen,
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
            {
              element: <DashboardLayout />,
              children: [
                {
                  errorElement: <RouteError />,
                  children: [
                    { index: true, element: <Desk /> },
                    {
                      path: '/journal',
                      element: <Journal />,
                      loader: journalLoader(queryClient)
                    },
                    {
                      path: '/expenses',
                      element: <Expenses />,
                      loader: expensesLoader(queryClient)
                    },
                    {
                      path: '/stats',
                      element: <Stats />,
                      loader: statsLoader(queryClient)
                    },
                    {
                      path: '/measure',
                      element: <Measure />,
                      loader: measureLoader(queryClient)
                    },
                    {
                      path: '/incidents',
                      element: <Incidents />,
                      loader: incidentsLoader(queryClient)
                    },
                    {
                      path: '/incidents/:id',
                      element: <Incident />,
                      loader: incidentLoader(queryClient)
                    }
                  ]
                }
              ]
            }
          ]
        },
        { path: '*', element: <Navigate to="/" replace /> }
      ]
    }
  ])
}
