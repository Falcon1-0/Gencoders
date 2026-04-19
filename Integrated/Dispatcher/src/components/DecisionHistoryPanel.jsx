import { Clock3, History, Server, Truck } from 'lucide-react'
import { formatDateTime } from '../lib/formatters.js'

export default function DecisionHistoryPanel({ entries = [] }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Recent decisions</div>
          <div className="mt-1 text-lg font-semibold text-white">Last 5 completed dispatch recommendations</div>
        </div>
        <div className="chip">
          <History size={14} />
          Decision log
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {!entries.length && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-command-slate">
            Completed dispatch decisions will appear here once the board settles the first recommendation.
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-white">{entry.loadId}</div>
                <div className="mt-1 text-sm text-command-slate">{entry.route}</div>
              </div>
              <div className="chip">
                <Truck size={14} />
                {entry.driverName}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-command-ink/70">
              <span className="chip !px-2 !py-1">
                <Clock3 size={12} />
                {formatDateTime(entry.updatedAt)}
              </span>
              <span className="chip !px-2 !py-1">
                <Server size={12} />
                {entry.provider}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-command-ink/75">{entry.summary}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
