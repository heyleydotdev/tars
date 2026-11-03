import type { QueryClient } from '@tanstack/react-query'
import { createHashRouter, Navigate, Outlet } from 'react-router'

import { GuestOnly, RequireAuth } from './components/auth-guard'
import DashboardLayout from './components/dashboard-layout'
import LoadingScreen from './components/loading-screen'
import RouteError from './components/route-error'
import {
  blueprintLoader,
  blueprintsLoader,
  expensesLoader,
  incidentLoader,
  incidentsLoader,
  journalLoader,
  measureLoader,
  statsLoader
} from './lib/loaders'
import Blueprint from './pages/blueprint'
import Blueprints from './pages/blueprints'
import Desk from './pages/desk'
import Expenses from './pages/expenses'
import Incident from './pages/incident'
import Incidents from './pages/incidents'
import Journal from './pages/journal'
import Login from './pages/login'
import Measure from './pages/measure'
import Register from './pages/register'
import Settings from './pages/settings'
import Stats from './pages/stats'
import UiReview from './pages/ui-review'
import Usage from './pages/usage'

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
                      path: '/blueprints',
                      element: <Blueprints />,
                      loader: blueprintsLoader(queryClient)
                    },
                    {
                      path: '/blueprints/:id',
                      element: <Blueprint />,
                      loader: blueprintLoader(queryClient)
                    },
                    { path: '/ui-review', element: <UiReview /> },
                    { path: '/usage', element: <Usage /> },
                    {
                      path: '/incidents',
                      element: <Incidents />,
                      loader: incidentsLoader(queryClient)
                    },
                    {
                      path: '/incidents/:id',
                      element: <Incident />,
                      loader: incidentLoader(queryClient)
                    },
                    { path: '/settings', element: <Settings /> }
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
