function CourtFilters({
  searchQuery,
  onSearchChange,
  filterOutdoor,
  filterLights,
  onToggleOutdoor,
  onToggleLights,
  showOnlyRequests,
  onToggleRequests,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg backdrop-blur">
      <label className="text-xs text-slate-300">
        Search courts
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Mellon Park, Schenley..."
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-orange-500"
        />
      </label>

      <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
        <button
          type="button"
          className={`rounded-xl border px-3 py-2 text-left transition ${
            filterOutdoor
              ? 'border-orange-500 bg-orange-500/10 text-orange-200'
              : 'border-slate-800 bg-slate-950/60 text-slate-300'
          }`}
          onClick={onToggleOutdoor}
        >
          Outdoor courts
        </button>
        <button
          type="button"
          className={`rounded-xl border px-3 py-2 text-left transition ${
            filterLights
              ? 'border-orange-500 bg-orange-500/10 text-orange-200'
              : 'border-slate-800 bg-slate-950/60 text-slate-300'
          }`}
          onClick={onToggleLights}
        >
          Lights available
        </button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          className="h-4 w-4 accent-orange-500"
          checked={showOnlyRequests}
          onChange={onToggleRequests}
        />
        Show courts with player requests
      </label>
    </div>
  )
}

export default CourtFilters
