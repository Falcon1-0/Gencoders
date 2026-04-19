import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import { AlertTriangle, TrendingDown, DollarSign, Zap } from 'lucide-react'
import { drivers, fleetMetrics, loadCostBreakdowns } from '../data/mockData.js'
import { getAiCostInsight } from '../api/claudeApi.js'
import { MetricCard, PageHeader, Spinner, AiSourceBadge } from '../components/UI.jsx'

// Colors for the stacked bar chart
const CHART_COLORS = {
  profit:    '#00e096',
  fuelCost:  '#ff4d6d',
  driverPay: '#ffb347',
  otherCost: '#6b7fa3'
}

// Custom tooltip for the bar chart
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-800 border border-navy-500 rounded p-3 text-[11px]">
      <div className="font-bold text-white mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4" style={{ color: p.fill }}>
          <span>{p.name}</span>
          <span className="font-bold">${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// Driver CPM bar rows
function CpmRow({ driver, avgCpm }) {
  const pct = Math.min((driver.cpm / 3.0) * 100, 100)
  const isHigh = driver.cpm > avgCpm * 1.1
  const isLow  = driver.cpm < avgCpm * 0.95
  const color  = isHigh ? '#ff4d6d' : isLow ? '#00e096' : '#00d4ff'

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-navy-600 last:border-0">
      <div className="w-28 text-[11px] text-gray-300 truncate">{driver.name.split(' ')[0]} {driver.name.split(' ')[1]?.[0]}.</div>
      <div className="flex-1 h-1.5 bg-navy-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-14 text-right">
        <span className="text-[11px] font-bold" style={{ color }}>${driver.cpm.toFixed(2)}</span>
      </div>
      {isHigh && (
        <AlertTriangle size={10} className="text-sentinel-amber flex-shrink-0" />
      )}
    </div>
  )
}

export default function CostIntelView() {
  const [aiInsight, setAiInsight] = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)

  useEffect(() => {
    fetchInsight()
  }, [])

  async function fetchInsight() {
    setLoadingInsight(true)
    const result = await getAiCostInsight(fleetMetrics, drivers)
    setAiInsight(result)
    setLoadingInsight(false)
  }

  // Sort drivers by CPM for the ranking table
  const sortedDrivers = [...drivers].sort((a, b) => a.cpm - b.cpm)
  const highCpmDrivers = drivers.filter(d => d.cpm > fleetMetrics.avgCpm * 1.1)

  const weeklyProfit = fleetMetrics.weeklyRevenue - fleetMetrics.weeklyFuelCost
  const profitMarginPct = Math.round((weeklyProfit / fleetMetrics.weeklyRevenue) * 100)

  return (
    <div className="p-6 space-y-5 min-h-full">
      <PageHeader
        title="Cost Intelligence"
        subtitle="Real-time CPM, profitability and deadhead analysis"
      />

      {/* ── Top metrics ── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Weekly revenue"
          value={`$${(fleetMetrics.weeklyRevenue / 1000).toFixed(1)}k`}
          sub="20 trucks · 48,200 miles"
          color="text-sentinel-green"
        />
        <MetricCard
          label="Weekly fuel cost"
          value={`$${(fleetMetrics.weeklyFuelCost / 1000).toFixed(1)}k`}
          sub={`${Math.round((fleetMetrics.weeklyFuelCost / fleetMetrics.weeklyRevenue) * 100)}% of revenue`}
          color="text-sentinel-red"
        />
        <MetricCard
          label="Net profit"
          value={`$${((fleetMetrics.weeklyRevenue - fleetMetrics.weeklyFuelCost) / 1000).toFixed(1)}k`}
          sub={`${profitMarginPct}% margin`}
          color="text-sentinel-cyan"
        />
        <MetricCard
          label="Deadhead alerts"
          value={fleetMetrics.deadheadAlerts}
          sub="Drivers >50mi empty"
          color="text-sentinel-amber"
          alert={fleetMetrics.deadheadAlerts > 0 ? 'Review routing' : null}
        />
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* ── Load profitability chart ── */}
        <div className="col-span-3 space-y-4">
          <div className="bg-navy-700 border border-navy-500 rounded-lg p-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-4">
              Profit vs expenses — active loads
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={loadCostBreakdowns} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="route"
                  tick={{ fill: '#6b7fa3', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7fa3', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend
                  wrapperStyle={{ fontSize: '10px', color: '#6b7fa3', fontFamily: 'IBM Plex Mono', paddingTop: '8px' }}
                />
                <Bar dataKey="profit"    name="Profit"     stackId="a" fill={CHART_COLORS.profit}    radius={[0,0,0,0]} />
                <Bar dataKey="fuelCost"  name="Fuel"       stackId="a" fill={CHART_COLORS.fuelCost}  />
                <Bar dataKey="driverPay" name="Driver pay" stackId="a" fill={CHART_COLORS.driverPay} />
                <Bar dataKey="otherCost" name="Other"      stackId="a" fill={CHART_COLORS.otherCost} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin table */}
          <div className="bg-navy-700 border border-navy-500 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-navy-500">
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
                Load profit margins
              </span>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-navy-600">
                  {['Route', 'Revenue', 'Fuel', 'Driver Pay', 'Profit', 'Margin'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] text-gray-600 uppercase tracking-wider font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-600">
                {loadCostBreakdowns.map(row => {
                  const marginPct = Math.round(row.margin * 100)
                  return (
                    <tr key={row.loadId} className="hover:bg-navy-600/30">
                      <td className="px-3 py-2 font-bold text-white">{row.route}</td>
                      <td className="px-3 py-2 text-sentinel-green">${row.revenue.toLocaleString()}</td>
                      <td className="px-3 py-2 text-sentinel-red">${row.fuelCost.toLocaleString()}</td>
                      <td className="px-3 py-2 text-sentinel-amber">${row.driverPay.toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold text-white">${row.profit.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className={`font-bold ${marginPct > 45 ? 'text-sentinel-green' : marginPct > 35 ? 'text-sentinel-cyan' : 'text-sentinel-red'}`}>
                          {marginPct}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right column: CPM ranking + AI insight ── */}
        <div className="col-span-2 space-y-4">
          {/* AI Insight card */}
          <div className={`
            bg-navy-700 border rounded-lg p-4
            ${aiInsight?.data?.severity === 'critical' ? 'border-sentinel-red/40' :
              aiInsight?.data?.severity === 'warning'  ? 'border-sentinel-amber/40' :
              'border-navy-500'}
          `}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={12} className="text-sentinel-cyan" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
                  AI Cost Insight
                </span>
              </div>
              {aiInsight && <AiSourceBadge source={aiInsight.source} />}
            </div>

            {loadingInsight && (
              <div className="flex items-center gap-2 py-2">
                <Spinner size={13} />
                <span className="text-[10px] text-gray-500">SENTINEL analyzing fleet data...</span>
              </div>
            )}

            {aiInsight?.data && (
              <div className="fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className={
                    aiInsight.data.severity === 'critical' ? 'text-sentinel-red' :
                    aiInsight.data.severity === 'warning'  ? 'text-sentinel-amber' :
                    'text-sentinel-cyan'
                  } />
                  <span className="text-xs font-bold text-white">{aiInsight.data.title}</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                  {aiInsight.data.insight}
                </p>
                <div className="bg-navy-800 border border-navy-600 rounded p-2.5">
                  <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 font-bold">
                    Recommended action
                  </div>
                  <p className="text-[10px] text-sentinel-cyan">{aiInsight.data.action}</p>
                </div>
              </div>
            )}

            <button
              onClick={fetchInsight}
              disabled={loadingInsight}
              className="mt-3 text-[9px] text-gray-600 hover:text-gray-400 underline"
            >
              Refresh insight
            </button>
          </div>

          {/* Deadhead alerts */}
          {highCpmDrivers.length > 0 && (
            <div className="bg-sentinel-amber/5 border border-sentinel-amber/25 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={12} className="text-sentinel-amber" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-sentinel-amber">
                  High CPM Alert
                </span>
              </div>
              {highCpmDrivers.map(d => (
                <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-sentinel-amber/10 last:border-0">
                  <span className="text-[11px] text-white">{d.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-sentinel-red font-bold">${d.cpm}/mi</span>
                    <span className="text-[9px] text-sentinel-amber">
                      +{Math.round(((d.cpm - fleetMetrics.avgCpm) / fleetMetrics.avgCpm) * 100)}% avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Driver CPM ranking */}
          <div className="bg-navy-700 border border-navy-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={12} className="text-gray-500" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
                CPM ranking — all drivers
              </span>
            </div>
            <div className="text-[9px] text-gray-600 mb-3">
              Fleet avg: <span className="text-sentinel-cyan font-bold">${fleetMetrics.avgCpm}/mi</span>
            </div>
            <div className="space-y-0">
              {sortedDrivers.map(d => (
                <CpmRow key={d.id} driver={d} avgCpm={fleetMetrics.avgCpm} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
