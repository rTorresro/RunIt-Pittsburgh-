function PlayerRequestsSection({
  playerRequests,
  loading,
  requestForm,
  requestSubmitting,
  activeCheckIn,
  profilesById,
  user,
  profile,
  courtName,
  formatRequestAge,
  now,
  onRequestChange,
  onSubmitRequest,
  onMarkFilled,
  onReportRequest,
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">Need players</p>
        <p className="text-xs text-slate-500">{playerRequests.length} open</p>
      </div>

      {!activeCheckIn && (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
          Check in to post a player request.
        </div>
      )}

      <form className="mt-4 space-y-3" onSubmit={onSubmitRequest}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-300">
            Players needed
            <input
              type="number"
              min="1"
              name="players_needed"
              value={requestForm.players_needed}
              onChange={onRequestChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
              placeholder="2"
              required
            />
          </label>
          <label className="text-xs text-slate-300">
            Skill preference
            <select
              name="skill_level_pref"
              value={requestForm.skill_level_pref}
              onChange={onRequestChange}
              className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
            >
              <option value="">Any</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
        </div>
        <label className="text-xs text-slate-300">
          Time
          <select
            name="time"
            value={requestForm.time}
            onChange={onRequestChange}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
          >
            <option value="Now">Now</option>
            <option value="15 min">15 min</option>
            <option value="30 min">30 min</option>
            <option value="1 hour">1 hour</option>
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          disabled={requestSubmitting || !activeCheckIn}
        >
          {requestSubmitting ? 'Posting...' : 'Post Request'}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-20 rounded-2xl bg-slate-800/60" />
            <div className="h-20 rounded-2xl bg-slate-800/60" />
          </div>
        ) : playerRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
            No active requests yet.
          </div>
        ) : (
          playerRequests.map((request) => {
            const requestProfile =
              profilesById[request.posted_by] ||
              (request.posted_by === user?.uid ? profile : null)
            const displayName =
              requestProfile?.name || requestProfile?.displayName || 'Hooper'
            const contactEmail = requestProfile?.email || user?.email || ''

            return (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Need {request.players_needed} player(s)
                    </p>
                    <p className="text-xs text-slate-400">
                      Skill: {request.skill_level_pref || 'Any'} · Time: {request.time}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Posted by {displayName} · {formatRequestAge(request.created_at, now)}
                    </p>
                    {contactEmail && (
                      <p className="mt-1 text-xs text-slate-400">Contact: {contactEmail}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {contactEmail && (
                      <a
                        href={`mailto:${contactEmail}?subject=RunIt%20Pittsburgh%20Run%20at%20${encodeURIComponent(
                          courtName
                        )}`}
                        className="rounded-xl bg-blue-500 px-3 py-2 text-center text-xs font-semibold text-slate-950 transition hover:bg-blue-400"
                      >
                        Join This Run
                      </a>
                    )}
                    {request.posted_by === user?.uid && (
                      <button
                        type="button"
                        className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
                        onClick={() => onMarkFilled(request.id)}
                        disabled={requestSubmitting}
                      >
                        {requestSubmitting ? 'Updating...' : 'Mark Filled'}
                      </button>
                    )}
                    {request.posted_by !== user?.uid && (
                      <button
                        type="button"
                        className="rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-orange-400 hover:text-orange-300"
                        onClick={() => onReportRequest(request.id)}
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default PlayerRequestsSection
