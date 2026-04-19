export default function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-command-cyan/25 bg-gradient-to-br from-command-blue to-command-cyan/80 shadow-glow">
        <div className="grid grid-cols-2 gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-white/95" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-white/95" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-white/95" />
          <span className="h-2.5 w-2.5 rounded-[3px] bg-white/95" />
        </div>
      </div>
      {!compact && (
        <div>
          <div className="font-display text-[2rem] uppercase leading-none tracking-[0.04em] text-white">
            FleetMind
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.34em] text-command-slate">
            COMMAND Intelligence Layer
          </div>
        </div>
      )}
    </div>
  )
}
