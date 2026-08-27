import { useState } from 'react'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import { clearSession, readSession, type Session } from './auth/store'

export default function App() {
  const [session, setSession] = useState<Session | null>(readSession)

  if (!session) return <AuthPage onAuthenticated={setSession} />

  return (
    <DashboardPage
      session={session}
      onSignOut={() => {
        clearSession()
        setSession(null)
      }}
    />
  )
}
