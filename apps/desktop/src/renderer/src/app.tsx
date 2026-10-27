import { useState } from 'react'

import TitleBar from './components/title-bar'
import Auth from './pages/auth'
import Dashboard from './pages/dashboard'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)

  if (authenticated) {
    return <Dashboard />
  }

  return (
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <TitleBar />
      <Auth onAuthenticated={() => setAuthenticated(true)} />
    </div>
  )
}
