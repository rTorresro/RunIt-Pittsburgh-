import { useEffect, useMemo, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Profile from './pages/Profile.jsx'
import ProfileSetup from './pages/ProfileSetup.jsx'
import Settings from './pages/Settings.jsx'
import Onboarding from './pages/Onboarding.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import BottomNav from './components/BottomNav.jsx'
import { useAuth } from './context/AuthContext.jsx'

function App() {
  const location = useLocation()
  const { user } = useAuth()
  const hideNav = location.pathname === '/login' || location.pathname === '/signup'
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true)

  useEffect(() => {
    const hasSeen = localStorage.getItem('runit_onboarding_seen')
    setHasSeenOnboarding(Boolean(hasSeen))
    setOnboardingChecked(true)
  }, [])

  const shouldShowOnboarding = useMemo(() => {
    if (!onboardingChecked) return false
    if (hasSeenOnboarding) return false
    if (location.pathname === '/onboarding') return false
    if (location.pathname === '/login' || location.pathname === '/signup') return false
    return true
  }, [hasSeenOnboarding, onboardingChecked, location.pathname])

  if (!onboardingChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-slate-950">
            🏀
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">RunIt Pittsburgh</p>
            <p className="text-xs text-slate-400">Pickup runs, right now</p>
          </div>
        </div>
      </header>

      <main
        key={location.pathname}
        className={`flex flex-1 flex-col fade-in ${hideNav ? '' : 'pb-20'}`}
      >
        <Routes>
          {shouldShowOnboarding && <Route path="*" element={<Navigate to="/onboarding" replace />} />}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courts/:id"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/setup"
            element={
              <ProtectedRoute>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!hideNav && user && <BottomNav />}

    </div>
  )
}

export default App
