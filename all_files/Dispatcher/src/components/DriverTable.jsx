import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'

function scoreTone(score) {
  if (score >= 75) return 'text-command-green'
  if (score >= 55) return 'text-command-amber'
  return 'text-command-red'
}

function RankDelta({ delta }) {
  if (delta > 0) {
    return (
      <span className="chip !px-2 !py-1 !text-command-green">
        <ArrowUp size={12} />
        +{delta}
      </span>
    )
  }

  if (delta < 0) {
    return (
      <span className="chip !px-2 !py-1 !text-command-red">
        <ArrowDown size={12} />
        {delta}
      </span>
    )
  }

  return (
    <span className="chip !px-2 !py-1 !text-command-slate">
      <Minus size={12} />
      0
    </span>
  )
}

export default function DriverTable({ candidates, selectedDriverId, onSelect, recommendedId }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="eyebrow">Live driver board</div>
          <div className="mt-1 text-lg font-semibold text-white">Rank every truck against the active load in real time</div>
        </div>
        <div className="chip">{candidates.length} tracked drivers</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-command-slate">
            <tr>
              <th className="px-5 py-3 font-medium">Driver</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Current city</th>
              <th className="px-5 py-3 font-medium">HOS</th>
              <th className="px-5 py-3 font-medium">Empty miles</th>
              <th className="px-5 py-3 font-medium">Proj. CPM</th>
              <th className="px-5 py-3 font-medium">On-time</th>
              <th className="px-5 py-3 font-medium">Rank move</th>
              <th className="px-5 py-3 font-medium">Fit score</th>
            </tr>
          </thead>
          <tbody>
            {!candidates.length && (
              <tr>
                <td colSpan="9" className="px-5 py-8 text-center text-command-slate">
                  Waiting for live dispatch candidates...
                </td>
              </tr>
            )}
            {candidates.map((candidate) => {
              const active = selectedDriverId === candidate.id
              const recommended = candidate.id === recommendedId
              return (
                <tr
                  key={candidate.id}
                  onClick={() => onSelect(candidate.id)}
                  className={`cursor-pointer border-t border-white/10 transition ${
                    active ? 'bg-command-blue/10' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-sm font-bold text-white">
                        {candidate.name
                          .split(' ')
                          .map((piece) => piece[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{candidate.name}</span>
                          {recommended && <span className="chip !px-2.5 !py-1">Best fit</span>}
                        </div>
                        <div className="text-xs text-command-slate">{candidate.truckId} · {candidate.laneFocus}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={candidate.status} pulse={candidate.name === 'K. Johnson'} />
                  </td>
                  <td className="px-5 py-4 text-command-ink/80">{candidate.currentCity}</td>
                  <td className="px-5 py-4 text-command-ink/80">{candidate.hosDriveHours.toFixed(1)} hr</td>
                  <td className="px-5 py-4 text-command-ink/80">{candidate.emptyMiles} mi</td>
                  <td className="px-5 py-4 text-command-ink/80">${candidate.projectedCpm.toFixed(2)}</td>
                  <td className="px-5 py-4 text-command-ink/80">{candidate.onTimeConfidence}%</td>
                  <td className="px-5 py-4">
                    <RankDelta delta={candidate.rankDelta || 0} />
                  </td>
                  <td className={`px-5 py-4 text-lg font-semibold ${scoreTone(candidate.score)}`}>
                    {candidate.score}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
