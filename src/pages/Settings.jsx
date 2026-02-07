import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION } from '../constants/app.js'

const STORAGE_KEY = 'runit_settings'

function Settings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    locationEnabled: true,
    notificationsEnabled: true,
  })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSettings((prev) => ({ ...prev, ...JSON.parse(stored) }))
      } catch (error) {
        console.warn('Failed to parse settings', error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new Event('runit-settings'))
  }, [settings])

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-50">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Control your app preferences.</p>

        <div className="mt-6 space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-100"
            onClick={() => toggleSetting('locationEnabled')}
          >
            <div>
              <p className="font-semibold">Location permissions</p>
              <p className="text-xs text-slate-400">Enable location-based court discovery.</p>
            </div>
            <span className={settings.locationEnabled ? 'text-emerald-400' : 'text-slate-500'}>
              {settings.locationEnabled ? 'On' : 'Off'}
            </span>
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-100"
            onClick={() => toggleSetting('notificationsEnabled')}
          >
            <div>
              <p className="font-semibold">Notifications</p>
              <p className="text-xs text-slate-400">Get alerts when you&apos;re up next.</p>
            </div>
            <span className={settings.notificationsEnabled ? 'text-emerald-400' : 'text-slate-500'}>
              {settings.notificationsEnabled ? 'On' : 'Off'}
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-100"
            onClick={() => {
              localStorage.removeItem('runit_onboarding_seen')
              navigate('/onboarding')
            }}
          >
            <div>
              <p className="font-semibold">View tutorial again</p>
              <p className="text-xs text-slate-400">Replay onboarding tips.</p>
            </div>
            <span className="text-slate-400">Open</span>
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
          App version: {APP_VERSION}
        </div>
      </div>
    </div>
  )
}

export default Settings
