import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Profile() {
  const navigate = useNavigate()
  const { user, profile, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-50">My Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Your account details</p>

        <div className="mt-6 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-800 bg-slate-950/60">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-orange-400">
                {profile?.name?.[0] || user?.displayName?.[0] || '🏀'}
              </div>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-100">
              {profile?.name || user?.displayName || 'Pickup hooper'}
            </p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
            <p className="mt-2 text-base font-semibold text-slate-100">
              {profile?.name || user?.displayName || 'Pickup hooper'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-2 text-base font-semibold text-slate-100">
              {user?.email}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Skill level</p>
            <p className="mt-2 text-base font-semibold text-slate-100">
              {profile?.skill_level || 'Not set'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Preferred position</p>
            <p className="mt-2 text-base font-semibold text-slate-100">
              {profile?.preferred_position || 'Any'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            onClick={() => navigate('/profile/setup')}
          >
            Edit Profile
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile
