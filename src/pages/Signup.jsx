import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthErrorMessage } from '../utils/authErrors.js'

function Signup() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signup({
        email: formState.email,
        password: formState.password,
        fullName: formState.fullName,
      })
      navigate('/profile/setup', { replace: true })
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-50">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Join the pickup community and track your runs.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Full name
            <input
              type="text"
              name="fullName"
              value={formState.fullName}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              placeholder="Alex Johnson"
              required
            />
          </label>

          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              placeholder="you@email.com"
              required
            />
          </label>

          <label className="block text-sm text-slate-300">
            Password
            <input
              type="password"
              name="password"
              value={formState.password}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              placeholder="Create a password"
              minLength={6}
              required
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            disabled={submitting}
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link className="font-semibold text-orange-400" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
