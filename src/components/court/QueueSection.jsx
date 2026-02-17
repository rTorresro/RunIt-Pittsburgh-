function QueueSection({
  queueEntries,
  loading,
  activeCheckIn,
  currentQueueEntry,
  currentCalledEntry,
  currentQueueIndex,
  profilesById,
  user,
  profile,
  calledEntriesCount,
  submitting,
  formatPosition,
  formatQueueDuration,
  now,
  onCallNext,
  onJoinQueue,
  onLeaveQueue,
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Who has next</p>
        <p className="text-xs text-slate-500">{queueEntries.length} waiting</p>
      </div>

      <div className="mt-3 space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-14 rounded-2xl bg-slate-800/60" />
            <div className="h-14 rounded-2xl bg-slate-800/60" />
          </div>
        ) : queueEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            The queue is empty.
          </div>
        ) : (
          queueEntries.map((entry, index) => {
            const entryProfile =
              profilesById[entry.user_id] ||
              (entry.user_id === user?.uid ? profile : null)
            const displayName =
              entryProfile?.name || entryProfile?.displayName || 'Hooper'
            const badgeLabel = index === 0 ? 'Next Up' : index === 1 ? 'On Deck' : null

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-200">
                  {formatPosition(index)}
                </div>
                <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                  {entryProfile?.photo_url ? (
                    <img
                      src={entryProfile.photo_url}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-orange-400">
                      {displayName[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100">{displayName}</p>
                    {badgeLabel && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        {badgeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatQueueDuration(entry.joined_at, now)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-4 space-y-3">
        {activeCheckIn && (
          <button
            type="button"
            className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
            onClick={onCallNext}
            disabled={submitting || queueEntries.length === 0 || calledEntriesCount > 0}
          >
            {queueEntries.length === 0
              ? 'Queue is empty'
              : calledEntriesCount > 0
              ? 'Next player already called'
              : 'Call Next'}
          </button>
        )}
        {currentQueueEntry ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            You&apos;re {currentQueueIndex >= 0 ? formatPosition(currentQueueIndex) : 'in line'}.
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            onClick={onJoinQueue}
            disabled={!activeCheckIn || submitting || currentCalledEntry}
          >
            {activeCheckIn ? 'Join Queue' : 'Check in to join'}
          </button>
        )}

        {(currentQueueEntry || currentCalledEntry) && (
          <button
            type="button"
            className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
            onClick={onLeaveQueue}
            disabled={submitting}
          >
            {submitting ? 'Leaving...' : 'Leave Queue'}
          </button>
        )}
      </div>
    </div>
  )
}

export default QueueSection
