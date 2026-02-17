function RecentCallsSection({ queueHistory, profilesById, user, profile }) {
  if (!queueHistory.length) return null

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">Recent calls</p>
      <div className="mt-3 space-y-2">
        {queueHistory.map((entry) => {
          const entryProfile =
            profilesById[entry.user_id] || (entry.user_id === user?.uid ? profile : null)
          const displayName =
            entryProfile?.name || entryProfile?.displayName || 'Hooper'

          return (
            <div key={entry.id} className="flex items-center justify-between text-sm text-slate-200">
              <span>{displayName}</span>
              <span className="text-xs text-slate-500">
                {entry.status === 'confirmed' ? 'confirmed' : 'called'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RecentCallsSection
