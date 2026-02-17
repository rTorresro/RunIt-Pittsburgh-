function CourtAmenities({ court }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Type</p>
        <p className="mt-2 text-base font-semibold text-slate-100">
          {court.outdoor ? 'Outdoor' : 'Indoor'}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Hoops</p>
        <p className="mt-2 text-base font-semibold text-slate-100">
          {court.num_hoops} hoops
        </p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">Lights</p>
        <p className="mt-2 text-base font-semibold text-slate-100">
          {court.has_lights ? 'Lights available' : 'No lights'}
        </p>
      </div>
    </div>
  )
}

export default CourtAmenities
