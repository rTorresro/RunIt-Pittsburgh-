import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'

const slides = [
  {
    id: 'welcome',
    title: 'Never miss a pickup game',
    subtitle: 'Find courts, join games, connect with hoopers in Pittsburgh.',
    actionLabel: 'Get Started',
    type: 'hero',
  },
  {
    id: 'how-it-works',
    title: 'How RunIt Works',
    actionLabel: 'Next',
    type: 'features',
  },
  {
    id: 'preview',
    title: 'See it in action',
    actionLabel: "Let's Play",
    type: 'preview',
  },
  {
    id: 'permissions',
    title: 'Almost there!',
    actionLabel: 'Continue',
    type: 'permissions',
  },
]

function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(0)

  const isLast = step === slides.length - 1
  const activeSlide = useMemo(() => slides[step], [step])

  const finishOnboarding = () => {
    localStorage.setItem('runit_onboarding_seen', 'true')
    if (user) {
      navigate('/', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
  }

  const handleNext = () => {
    if (isLast) {
      finishOnboarding()
    } else {
      setStep((prev) => Math.min(prev + 1, slides.length - 1))
    }
  }

  const handleSkip = () => {
    finishOnboarding()
  }

  const handleEnableLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(() => {
      const stored = localStorage.getItem('runit_settings')
      const next = stored ? JSON.parse(stored) : {}
      localStorage.setItem(
        'runit_settings',
        JSON.stringify({ ...next, locationEnabled: true })
      )
    })
  }

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    const stored = localStorage.getItem('runit_settings')
    const next = stored ? JSON.parse(stored) : {}
    localStorage.setItem(
      'runit_settings',
      JSON.stringify({ ...next, notificationsEnabled: permission === 'granted' })
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      {!isLast && (
        <button
          type="button"
          className="absolute right-6 top-6 text-sm font-semibold text-slate-300 transition hover:text-white"
          onClick={handleSkip}
        >
          Skip
        </button>
      )}

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeSlide.type === 'hero' && (
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80"
                    alt="Basketball court"
                    className="h-48 w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold leading-tight text-slate-50">
                    {activeSlide.title}
                  </h1>
                  <p className="mt-3 text-sm text-slate-300">{activeSlide.subtitle}</p>
                </div>
              </div>
            )}

            {activeSlide.type === 'features' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">{activeSlide.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Everything you need to jump into a run.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      icon: '📍',
                      title: 'Find active courts',
                      description: 'See pickup games near you in real time.',
                    },
                    {
                      icon: '👥',
                      title: "Who's playing",
                      description: 'Check who is currently on the court.',
                    },
                    {
                      icon: '🏀',
                      title: 'Join the action',
                      description: 'Hop in the queue or find a team.',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left"
                    >
                      <div className="text-2xl">{item.icon}</div>
                      <p className="mt-3 text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="mt-2 text-xs text-slate-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSlide.type === 'preview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">{activeSlide.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Your court, queue, and player finder in one place.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="grid h-40 grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-800/80" />
                    <div className="rounded-xl bg-slate-900/90 p-3 text-xs text-slate-300">
                      <div className="mb-2 h-2 w-16 rounded-full bg-slate-700" />
                      <div className="mb-2 h-3 w-24 rounded bg-slate-700" />
                      <div className="space-y-2">
                        <div className="h-6 rounded bg-slate-800" />
                        <div className="h-6 rounded bg-slate-800" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Map + details side by side for fast decisions.
                  </p>
                </div>
              </div>
            )}

            {activeSlide.type === 'permissions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-50">{activeSlide.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    We use these to keep your runs moving smoothly.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-sm font-semibold text-slate-100">Location access</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Show nearby courts and help check you in faster.
                    </p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950"
                      onClick={handleEnableLocation}
                    >
                      Enable Location
                    </button>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-sm font-semibold text-slate-100">Notifications</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Get alerts when it’s your turn in the queue.
                    </p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100"
                      onClick={handleEnableNotifications}
                    >
                      Enable Notifications
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-slate-400 underline"
                  onClick={finishOnboarding}
                >
                  Skip for now
                </button>
              </div>
            )}

            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950"
              onClick={handleNext}
            >
              {activeSlide.actionLabel}
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((slide, index) => (
            <span
              key={slide.id}
              className={`h-2 w-2 rounded-full ${
                index === step ? 'bg-orange-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Onboarding
