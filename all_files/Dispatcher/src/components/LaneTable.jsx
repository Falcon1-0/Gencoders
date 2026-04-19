export default function LaneTable({ lanes }) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="eyebrow">Lane intelligence</div>
          <div className="mt-1 text-lg font-semibold text-white">Where margin is leaking across the network</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-command-slate">
            <tr>
              <th className="px-5 py-3 font-medium">Lane</th>
              <th className="px-5 py-3 font-medium">Avg CPM</th>
              <th className="px-5 py-3 font-medium">Margin</th>
              <th className="px-5 py-3 font-medium">Deadhead</th>
              <th className="px-5 py-3 font-medium">Core issue</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr key={lane.lane} className="border-t border-white/10">
                <td className="px-5 py-4 font-medium text-white">{lane.lane}</td>
                <td className="px-5 py-4 text-command-ink/80">${lane.avgCpm.toFixed(2)}</td>
                <td className="px-5 py-4 text-command-ink/80">${lane.avgMarginPerMile.toFixed(2)}/mi</td>
                <td className="px-5 py-4 text-command-ink/80">{lane.deadheadPct}%</td>
                <td className="px-5 py-4 text-command-ink/80">{lane.issue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
