function CurrentlyHereSection({
  checkIns,
  loading,
  profilesById,
  user,
  profile,
  formatTimeAgo,
  now,
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Currently here</p>
        <p className="text-xs text-slate-500">{checkIns.length} player(s)</p>
      </div>
      <div className="mt-3 space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-2xl bg-slate-800/60" />
            <div className="h-16 rounded-2xl bg-slate-800/60" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            No one has checked in yet.
          </div>
        ) : (
          checkIns.map((entry) => {
            const entryProfile =
              profilesById[entry.user_id] ||
              (entry.user_id === user?.uid ? profile : null)
            const displayName =
              entryProfile?.name || entryProfile?.displayName || 'Hooper'
            const skillLevel = entryProfile?.skill_level || 'Not set'

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                  {entryProfile?.photo_url ? (
                    <img
                      src={entryProfile.photo_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-orange-400">
                      {displayName[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">{displayName}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-slate-400">{skillLevel}</p>
                    {entry.looking_for_team && (
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                        Looking for players
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {formatTimeAgo(entry.check_in_time, now)}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default CurrentlyHereSection
