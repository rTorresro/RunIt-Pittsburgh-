import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { createUserProfile, updateUserProfile } from '../utils/profile.js'

const skillOptions = ['Beginner', 'Intermediate', 'Advanced']
const positionOptions = ['Guard', 'Forward', 'Center', 'Any']

function ProfileSetup() {
  const navigate = useNavigate()
  const { user, profile, setProfile } = useAuth()
  const [formState, setFormState] = useState({
    name: profile?.name || user?.displayName || '',
    skill_level: profile?.skill_level || '',
    preferred_position: profile?.preferred_position || 'Any',
    photo_url: profile?.photo_url || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user) return
    setError('')
    setSaving(true)

    try {
      if (profile) {
        await updateUserProfile(user.uid, {
          name: formState.name,
          skill_level: formState.skill_level,
          preferred_position: formState.preferred_position,
          photo_url: formState.photo_url,
        })
      } else {
        await createUserProfile({
          uid: user.uid,
          email: user.email,
          name: formState.name,
          skill_level: formState.skill_level,
          preferred_position: formState.preferred_position,
          photo_url: formState.photo_url,
        })
      }
      setProfile({
        uid: user.uid,
        email: user.email,
        name: formState.name,
        skill_level: formState.skill_level,
        preferred_position: formState.preferred_position,
        photo_url: formState.photo_url,
      })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.message || 'Unable to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-50">Complete your profile</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tell us about your game before hitting the courts.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-300">
            Full name
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              placeholder="Alex Johnson"
              required
            />
          </label>

          <label className="block text-sm text-slate-300">
            Skill level
            <select
              name="skill_level"
              value={formState.skill_level}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              required
            >
              <option value="" disabled>
                Select skill level
              </option>
              {skillOptions.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-300">
            Preferred position
            <select
              name="preferred_position"
              value={formState.preferred_position}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
            >
              {positionOptions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-300">
            Profile photo (optional)
            <input
              type="text"
              name="photo_url"
              value={formState.photo_url}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              placeholder="Paste image URL"
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
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetup
