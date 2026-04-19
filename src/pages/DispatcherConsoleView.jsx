import React from 'react'
import { ArrowLeft, BellRing, Fuel, ShieldAlert, Truck, Users } from 'lucide-react'
import { dispatcherSnapshot, driverProfile, routeOptions } from '../data/driverConsoleData.js'

function SnapshotCard({ label, value, detail, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.04]',
    success: 'border-emerald-300/20 bg-emerald-300/10',
    warning: 'border-amber-300/20 bg-amber-300/10',
    danger: 'border-rose-300/20 bg-rose-300/10'
  }

  return (
    <div className={`rounded-3xl border p-5 ${tones[tone] || tones.neutral}`}>
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/62">{detail}</div>
    </div>
  )
}

export default function DispatcherConsoleView({ onChangeRole, onOpenDriver }) {
  const preferredRoute = routeOptions.find((route) => route.id === 'traffic') || routeOptions[0]

  return (
    <div className="min-h-screen bg-app-shell text-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
        <header className="rounded-[32px] border border-white/10 bg-white/5 px-6 py-6 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button onClick={onChangeRole} className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">
                <ArrowLeft size={16} />
                Change role
              </button>
              <div className="mt-4 flex items-center gap-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f3554] text-[#a5e3ff]">
                  <Users size={24} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">Dispatcher command</div>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Operations overview</h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">
                This companion screen previews how dispatch can monitor the new driver workflow, receive emergencies, and validate route decisions.
              </p>
            </div>

            <button
              onClick={onOpenDriver}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-50 transition-colors hover:bg-emerald-300/15"
            >
              <Truck size={16} />
              Open driver screen
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard label="Active drivers" value={dispatcherSnapshot.activeDrivers} detail="Fleet members reporting today" tone="neutral" />
          <SnapshotCard label="Active trips" value={dispatcherSnapshot.activeTrips} detail="Trips currently in motion" tone="success" />
          <SnapshotCard label="Safety alerts" value={dispatcherSnapshot.safetyAlerts} detail="Requires dispatcher attention" tone="danger" />
          <SnapshotCard label="Emergency ready" value={dispatcherSnapshot.emergencyReady ? 'Yes' : 'No'} detail="Red-button escalation online" tone="warning" />
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#121826]/88 p-6">
            <div className="flex items-center gap-3">
              <BellRing size={18} className="text-[#7dd3fc]" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Phase 1 flow</div>
                <div className="mt-1 text-2xl font-semibold text-white">What the dispatcher sees</div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {dispatcherSnapshot.queue.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/72">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#1a1320]/88 p-6">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-[#fb7185]" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Live driver mirror</div>
                <div className="mt-1 text-2xl font-semibold text-white">{driverProfile.name}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Preferred route</div>
                <div className="mt-2 text-lg font-semibold text-white">{preferredRoute.label}</div>
                <div className="mt-1 text-sm text-white/62">{preferredRoute.blockage}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 text-white">
                  <Fuel size={16} className="text-[#f59e0b]" />
                  <span className="text-lg font-semibold">Fuel alarm watch</span>
                </div>
                <div className="mt-2 text-sm leading-6 text-white/68">
                  Driver tank is at {driverProfile.fuelTankPercent}% with alarm threshold set to {driverProfile.alarmThreshold}%.
                </div>
              </div>
              <div className="rounded-3xl border border-rose-300/20 bg-rose-300/10 p-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-rose-100/65">Emergency logic</div>
                <div className="mt-2 text-lg font-semibold text-white">Dispatcher is first notified</div>
                <div className="mt-1 text-sm leading-6 text-white/70">
                  Then the closest support driver and 911 are included when the incident type requires urgent help.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
