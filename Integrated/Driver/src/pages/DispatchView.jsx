import React, { useState } from 'react'
import { Inbox, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { drivers, loads, fleetMetrics } from '../data/mockData.js'
import { MetricCard, StatusBadge, HosBar, PageHeader } from '../components/UI.jsx'
import SmartMatchPanel from '../components/SmartMatchPanel.jsx'

/* 🚀 Load Classification Logic */
const classifyLoad = (load) => {
  const profitScore = load.rateCents / load.distanceMiles
  const urgencyScore = Math.random()
  const volatilityScore = Math.random()

  if (profitScore > 3) return { label: "Most Profitable", color: "green" }
  if (urgencyScore > 0.75) return { label: "Urgent", color: "red" }
  if (volatilityScore > 0.75) return { label: "Volatile", color: "yellow" }

  return { label: "Normal", color: "blue" }
}

export default function DispatchView() {
  const [expandedLoadId, setExpandedLoadId] = useState(null)
  const [assignedLoads, setAssignedLoads] = useState({})

  const pendingLoads = loads
    .filter(l => l.status === 'pending')
    .map(l => ({
      ...l,
      tag: classifyLoad(l)
    }))

  const activeLoads = loads.filter(l => l.status === 'in_transit')

  const toggleLoad = (id) => setExpandedLoadId(prev => prev === id ? null : id)

  const handleAssign = (load, driver) => {
    setAssignedLoads(prev => ({ ...prev, [load.id]: driver.name }))
  }

  return (
    <div className="p-6 space-y-6 min-h-full bg-gray-50">

      <PageHeader
        title="Dispatcher Hub"
        subtitle="AI-powered load optimization and driver matching"
      />

      {/* ── Metrics ── */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Fleet avg CPM" value={`$${fleetMetrics.avgCpm}`} sub="▼ $0.06 vs last week" color="text-green-600" />
        <MetricCard label="Pending loads" value={pendingLoads.length} sub={`${activeLoads.length} in transit`} color="text-blue-600" />
        <MetricCard label="HOS violations" value={fleetMetrics.hosViolations} sub="Driver 6 · flagged" color="text-red-600" alert="Immediate action needed" />
        <MetricCard label="On-time rate" value={`${Math.round(fleetMetrics.onTimeRate * 100)}%`} sub="+2% vs last month" color="text-green-600" />
      </div>

      <div className="grid grid-cols-5 gap-5">

        {/* ── LOADS ── */}
        <div className="col-span-3 space-y-3">

          <div className="flex items-center gap-2 mb-2">
            <Inbox size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Pending Loads ({pendingLoads.length})
            </span>
          </div>

          {pendingLoads.map(load => (
            <div key={load.id} className="space-y-2">

              {/* Load Card */}
              <button
                className={`
                  w-full text-left bg-white border rounded-lg px-4 py-3 shadow-sm
                  flex items-center justify-between
                  ${expandedLoadId === load.id ? 'border-blue-500' : 'border-gray-200'}
                  ${assignedLoads[load.id] ? 'opacity-60' : ''}
                `}
                onClick={() => toggleLoad(load.id)}
              >

                {/* LEFT */}
                <div className="flex-1">

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-gray-400">
                      {load.id}
                    </span>

                    {assignedLoads[load.id] && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Assigned → {assignedLoads[load.id]}
                      </span>
                    )}
                  </div>

                  {/* TITLE + TAG */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {load.origin.city} → {load.destination.city}
                    </span>

                    <span className={`
                      text-[10px] px-2 py-0.5 rounded-full font-semibold
                      ${load.tag.color === "green" && "bg-green-100 text-green-700"}
                      ${load.tag.color === "red" && "bg-red-100 text-red-700"}
                      ${load.tag.color === "yellow" && "bg-yellow-100 text-yellow-700"}
                      ${load.tag.color === "blue" && "bg-blue-100 text-blue-700"}
                    `}>
                      {load.tag.label}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {load.distanceMiles.toLocaleString()} mi · {load.commodity}
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-green-600">
                    ${(load.rateCents / 100).toLocaleString()}
                  </span>

                  {expandedLoadId === load.id
                    ? <ChevronUp size={16} className="text-gray-500" />
                    : <ChevronDown size={16} className="text-gray-500" />
                  }
                </div>
              </button>

              {/* Smart Match */}
              {expandedLoadId === load.id && (
                <div className="ml-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                  <SmartMatchPanel load={load} drivers={drivers} onAssign={handleAssign} />
                </div>
              )}
            </div>
          ))}

          {/* ACTIVE LOADS */}
          <div className="mt-6">
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Active Loads ({activeLoads.length})
            </span>

            <div className="space-y-2 mt-2">
              {activeLoads.map(load => {
                const driver = drivers.find(d => d.id === load.assignedDriverId)

                return (
                  <div key={load.id} className="bg-white border border-gray-200 px-3 py-2 rounded shadow-sm flex justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {load.origin.city} → {load.destination.city}
                    </span>

                    <span className="text-xs text-gray-500">
                      {driver?.name} · In Transit
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── DRIVERS ── */}
        <div className="col-span-2">

          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase">
              Drivers ({drivers.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {drivers.map(driver => (
              <div key={driver.id} className="bg-white border border-gray-200 rounded p-3 shadow-sm">

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {driver.name}
                  </span>
                  <StatusBadge status={driver.status} />
                </div>

                <HosBar hours={driver.hosRemaining} />

                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>CPM: ${driver.cpm}</span>
                  <span>Fuel: {Math.round(driver.fuelLevel * 100)}%</span>
                  <span>{driver.truckId}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}