import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function barTone(value) {
  if (value >= 2.08) return '#ef4444'
  if (value >= 1.9) return '#f59e0b'
  return '#22d3ee'
}

export default function CostBarChart({ data, fleetAverage }) {
  return (
    <div className="panel p-5">
      <div className="eyebrow">Driver cost by week</div>
      <div className="mt-1 text-lg font-semibold text-white">Who is above fleet baseline right now?</div>
      <div className="mt-5 h-[320px] w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#91a4b7', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#91a4b7', fontSize: 12 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{ background: '#0f1d2b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'CPM']}
            />
            <Bar dataKey="avgCpm" radius={[12, 12, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={barTone(entry.avgCpm)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-command-slate">Fleet baseline this week: ${fleetAverage.toFixed(2)} CPM</div>
    </div>
  )
}
