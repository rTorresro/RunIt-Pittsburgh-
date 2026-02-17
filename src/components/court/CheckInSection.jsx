function CheckInSection({
  activeCheckIn,
  shouldShowExpiryBanner,
  currentCalledEntry,
  shouldShowCalledBanner,
  shouldShowExtend,
  submitting,
  onConfirmPlaying,
  onExtend,
  onCheckOut,
  onCheckIn,
  onToggleLooking,
}) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">Check-in</p>
      <div className="mt-3">
        {activeCheckIn ? (
          <div className="space-y-3">
            {shouldShowExpiryBanner && (
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-200">
                Your check-in expires in about 15 minutes.
              </div>
            )}
            {currentCalledEntry && shouldShowCalledBanner && (
              <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-xs text-blue-200">
                You&apos;re up! Head to the court.
              </div>
            )}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              You&apos;re checked in.
            </div>
            {currentCalledEntry && (
              <button
                type="button"
                className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-400"
                onClick={onConfirmPlaying}
                disabled={submitting}
              >
                {submitting ? 'Confirming...' : "Confirm - I'm Playing"}
              </button>
            )}
            {shouldShowExtend && (
              <button
                type="button"
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
                onClick={onExtend}
                disabled={submitting}
              >
                {submitting ? 'Extending...' : 'Extend Check-In'}
              </button>
            )}
            <button
              type="button"
              className="w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              onClick={onCheckOut}
              disabled={submitting}
            >
              {submitting ? 'Checking out...' : 'Check Out'}
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300"
              onClick={onToggleLooking}
              disabled={submitting}
            >
              {activeCheckIn.looking_for_team
                ? 'Looking for players: On'
                : 'Looking for players: Off'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
            onClick={onCheckIn}
            disabled={submitting}
          >
            {submitting ? 'Checking in...' : 'Check In Here'}
          </button>
        )}
      </div>
    </div>
  )
}

export default CheckInSection
