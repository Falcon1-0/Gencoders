import { AlertTriangle, LoaderCircle, PlayCircle, Sparkles, TrendingDown, Truck } from 'lucide-react'
import { formatCurrency } from '../lib/formatters.js'
import StatusBadge from './StatusBadge.jsx'

export default function RecommendationPanel({
  analysis,
  selectedDriver,
  onPlayVoice,
  onOpenBackend,
  voiceBusy,
  weatherSummary,
  loading,
}) {
  if (!analysis?.recommended) {
    return (
      <div className="panel p-5">
        <div className="eyebrow">Recommendation</div>
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-command-ink/70">
          {loading && <LoaderCircle size={16} className="animate-spin text-command-cyan" />}
          {analysis?.error || (loading ? 'Refreshing live dispatch decision...' : 'Waiting for ranked driver choices.')}
        </p>
      </div>
    )
  }

  const { recommended, options } = analysis

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Smart dispatch recommendation</div>
            <h3 className="mt-2 text-2xl font-semibold text-white">Assign {recommended.name}</h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onPlayVoice}
              disabled={voiceBusy}
              className="chip disabled:opacity-60"
            >
              <PlayCircle size={15} />
              {voiceBusy ? 'Playing...' : 'Play dispatch brief'}
            </button>
            <button
              type="button"
              onClick={onOpenBackend}
              className="chip border-command-green/40 bg-command-green/10 text-command-green"
            >
              <Truck size={15} />
              Open backend
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-command-ink/80">{analysis.summary}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="panel-muted p-4">
            <div className="data-label">Why this truck</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-command-ink/80">
              {recommended.reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <Sparkles size={15} className="mt-1 shrink-0 text-command-cyan" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel-muted p-4">
            <div className="data-label">Trip economics</div>
            <div className="mt-3 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-command-slate">Projected trip cost</span>
                <span className="font-semibold text-white">{formatCurrency(recommended.projectedTripCost, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-command-slate">Expected margin</span>
                <span className="font-semibold text-white">{formatCurrency(recommended.marginUsd, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-command-slate">Savings vs nearest truck</span>
                <span className="font-semibold text-command-green">{formatCurrency(analysis.savingsVsNaive, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-command-slate">Live weather</span>
                <span className="font-semibold text-white">{weatherSummary?.riskLabel || analysis.weatherLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-command-red/20 bg-command-red/10 p-4 text-sm leading-6 text-command-ink/80">
          <div className="flex items-center gap-2 font-semibold text-white">
            <AlertTriangle size={16} className="text-command-red" />
            Why not the nearest truck?
          </div>
          <p className="mt-2">{analysis.whyNotNearest}</p>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Top 3 ranked choices</div>
            <p className="mt-1 text-sm text-command-ink/70">This is the exact reasoning layer missing from the current dispatcher workflow.</p>
          </div>
          <div className="chip">
            <Truck size={14} />
            {analysis.laneMiles} loaded miles
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {options.slice(0, 3).map((candidate, index) => (
            <div key={candidate.id} className="panel-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2 py-1 text-xs font-semibold text-command-slate">#{index + 1}</span>
                    <span className="text-lg font-semibold text-white">{candidate.name}</span>
                    <StatusBadge status={candidate.status} pulse={candidate.name === 'K. Johnson'} />
                  </div>
                  <div className="mt-1 text-sm text-command-slate">
                    {candidate.currentCity} · {candidate.emptyMiles} empty mi · {candidate.hosDriveHours.toFixed(1)} HOS hr
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-right text-sm">
                  <div>
                    <div className="data-label">Fit score</div>
                    <div className="mt-1 font-semibold text-white">{candidate.score}</div>
                  </div>
                  <div>
                    <div className="data-label">Proj. CPM</div>
                    <div className="mt-1 font-semibold text-white">${candidate.projectedCpm.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="data-label">On-time</div>
                    <div className="mt-1 font-semibold text-white">{candidate.onTimeConfidence}%</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDriver && (
        <div className="panel p-5">
          <div className="eyebrow">Selected driver deep dive</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-white">{selectedDriver.name}</h3>
            <StatusBadge status={selectedDriver.status} pulse={selectedDriver.name === 'K. Johnson'} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="panel-muted p-4">
              <div className="data-label">Empty miles</div>
              <div className="mt-1 text-xl font-semibold text-white">{selectedDriver.emptyMiles}</div>
              <div className="mt-1 text-xs text-command-slate">Position to pickup</div>
            </div>
            <div className="panel-muted p-4">
              <div className="data-label">Resets needed</div>
              <div className="mt-1 text-xl font-semibold text-white">{selectedDriver.resetsNeeded}</div>
              <div className="mt-1 text-xs text-command-slate">Hours of service pressure</div>
            </div>
            <div className="panel-muted p-4">
              <div className="data-label">Projected margin</div>
              <div className="mt-1 text-xl font-semibold text-white">{formatCurrency(selectedDriver.marginUsd, 0)}</div>
              <div className="mt-1 text-xs text-command-slate">At current rate</div>
            </div>
            <div className="panel-muted p-4">
              <div className="data-label">Lane fit</div>
              <div className="mt-1 text-xl font-semibold text-white">{Math.round(selectedDriver.routeFit * 100)}%</div>
              <div className="mt-1 text-xs text-command-slate">Historic corridor performance</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-command-ink/75">
            {selectedDriver.name === recommended.name ? (
              <span>
                <TrendingDown size={15} className="mr-2 inline text-command-green" />
                This driver is the best balance of margin protection, HOS feasibility, and customer service.
              </span>
            ) : (
              <span>
                This truck is workable, but not the best fit right now. The ranking model is penalizing either extra deadhead, more resets, or weaker lane economics.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
