import { AlertTriangle, Clock3, Sparkles, Truck } from 'lucide-react'
import { formatDateTime } from '../lib/formatters.js'

const toneMap = {
  amber: AlertTriangle,
  green: Truck,
  cyan: Sparkles,
}

export default function BoardActivityFeed({ activity = [] }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Board activity</div>
          <div className="mt-1 text-lg font-semibold text-white">What changed on the dispatch floor</div>
        </div>
        <div className="chip">
          <Clock3 size={14} />
          Live event feed
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {!activity.length && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-command-slate">
            Waiting for board activity...
          </div>
        )}
        {activity.map((item) => {
          const Icon = toneMap[item.tone] || Sparkles
          return (
            <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-command-cyan">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-white">{item.title}</div>
                    <div className="text-xs text-command-slate">{formatDateTime(item.timestamp)}</div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-command-ink/75">{item.detail}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
