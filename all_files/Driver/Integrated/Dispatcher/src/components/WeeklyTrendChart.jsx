import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function WeeklyTrendChart({ data, focusDriver }) {
  return (
    <div className="panel p-5">
      <div className="eyebrow">Trendline</div>
      <div className="mt-1 text-lg font-semibold text-white">Fleet vs {focusDriver}</div>
      <div className="mt-5 h-[320px] w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#91a4b7', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#91a4b7', fontSize: 12 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip
              contentStyle={{ background: '#0f1d2b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'CPM']}
            />
            <Legend />
            <Line type="monotone" dataKey="fleet" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4 }} name="Fleet" />
            <Line type="monotone" dataKey={focusDriver} stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} name={focusDriver} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
