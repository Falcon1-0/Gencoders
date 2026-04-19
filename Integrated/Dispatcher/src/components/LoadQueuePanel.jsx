import { Clock3, Flag, PackageOpen, Truck } from 'lucide-react'
import { formatCurrency, formatDateTime } from '../lib/formatters.js'

function priorityTone(priority) {
  const normalized = (priority || '').toLowerCase()
  if (normalized.includes('hot')) return 'text-command-red'
  if (normalized.includes('risk')) return 'text-command-amber'
  return 'text-command-cyan'
}

function formatLoadMoment(dateLike) {
  const date = new Date(dateLike)
  return {
    date: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  }
}

export default function LoadQueuePanel({ activeLoad, queuedLoads = [], clock }) {
  if (!activeLoad) {
    return (
      <div className="panel p-5">
        <div className="eyebrow">Live queue</div>
        <div className="mt-3 text-sm text-command-slate">Waiting for live loads...</div>
      </div>
    )
  }

  const pickupMoment = formatLoadMoment(activeLoad.pickupAt)
  const deliveryMoment = formatLoadMoment(activeLoad.deliveryBy)

  return (
    <div className="panel p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Live dispatch board</div>
          <h1 className="section-title mt-1">Active load, moving clock, and hot queue</h1>
        </div>
        <div className="chip">
          <Clock3 size={14} />
          Board time {formatDateTime(clock)}
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-7 text-command-ink/80">
        The board is simulating incoming freight, driver movement, and automatic reranking so the dispatch experience feels alive instead of preloaded.
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="data-label">Active load</div>
              <div className="mt-1 text-xl font-semibold text-white">{activeLoad.id}</div>
              <div className="mt-1 text-sm text-command-ink/75">
                {activeLoad.origin} to {activeLoad.destination}
              </div>
            </div>
            <div className={`chip ${priorityTone(activeLoad.priority)}`}>
              <Flag size={14} />
              {activeLoad.priority || 'Standard'}
            </div>
          </div>

          <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(128px,1fr))]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="data-label">Pickup</div>
              <div className="mt-2 text-lg font-semibold leading-tight text-white">{pickupMoment.date}</div>
              <div className="mt-1 text-sm text-command-ink/75">{pickupMoment.time}</div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="data-label">Delivery</div>
              <div className="mt-2 text-lg font-semibold leading-tight text-white">{deliveryMoment.date}</div>
              <div className="mt-1 text-sm text-command-ink/75">{deliveryMoment.time}</div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="data-label">Rate</div>
              <div className="mt-2 text-lg font-semibold leading-tight text-white">{formatCurrency(activeLoad.rateUsd, 0)}</div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <div className="data-label">Weight</div>
              <div className="mt-2 text-lg font-semibold leading-tight text-white">{activeLoad.weightLbs.toLocaleString()}</div>
              <div className="mt-1 text-sm text-command-ink/75">lbs</div>
            </div>
          </div>
        </div>

        <div className="panel-muted p-4">
          <div className="flex items-center gap-2">
            <PackageOpen size={16} className="text-command-cyan" />
            <div>
              <div className="data-label">Incoming queue</div>
              <div className="mt-1 text-sm text-command-ink/75">Next loads already stacked behind the active tender.</div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {queuedLoads.slice(0, 4).map((load) => (
              <div key={load.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{load.id}</div>
                    <div className="mt-1 text-xs text-command-slate">
                      {load.origin} to {load.destination}
                    </div>
                  </div>
                  <div className={`text-xs font-semibold ${priorityTone(load.priority)}`}>{load.priority}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-command-ink/70">
                  <span className="chip !px-2 !py-1">
                    <Truck size={12} />
                    {formatCurrency(load.rateUsd, 0)}
                  </span>
                  <span>Pickup {formatDateTime(load.pickupAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
