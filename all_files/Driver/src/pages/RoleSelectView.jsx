import React from 'react'
import { ChevronRight, Shield, Truck, Users, Route, Fuel, MessageSquareWarning } from 'lucide-react'
import { getNavProConnection, navProCapabilityNotes } from '../api/navProApi.js'

function RoleCard({ title, eyebrow, description, icon: Icon, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className={`group rounded-[28px] border p-6 text-left transition-all duration-200 hover:-translate-y-1 ${accent}`}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Icon size={22} />
        </div>
        <ChevronRight size={18} className="opacity-60 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
      <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.3em] text-white/60">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-white/70">{description}</p>
    </button>
  )
}

export default function RoleSelectView({ onSelectRole }) {
  const navProConnection = getNavProConnection()

  return (
    <div className="min-h-screen bg-app-shell text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="rounded-[32px] border border-white/10 bg-white/5 px-6 py-6 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#103c36] text-[#8ef1d2]">
                  <Shield size={22} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.35em] text-white/55">Fleet Intelligence</div>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-5xl">Command Sentinel Driver Ops</h1>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
                Phase 1 is a driver-first operations console: route planning, HOS, rest stops, fuel intelligence, nearby driver support,
                AI chat, and one-tap emergency escalation to dispatcher and emergency services.
              </p>
            </div>

            <div className="max-w-sm rounded-3xl border border-emerald-300/15 bg-emerald-300/8 px-5 py-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/75">Integration status</div>
              <div className="mt-2 text-lg font-semibold text-white">{navProConnection.label}</div>
              <p className="mt-2 text-sm leading-6 text-emerald-50/75">{navProConnection.detail}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.95fr]">
          <RoleCard
            title="I’m a Driver"
            eyebrow="Driver console"
            description="Plan the trip, compare route choices, monitor fuel and HOS, find nearby help, and talk to the AI copilot without hunting through clutter."
            icon={Truck}
            onClick={() => onSelectRole('driver')}
            accent="border-emerald-300/20 bg-gradient-to-br from-[#103c36] via-[#10262d] to-[#111725] text-[#dffcf3]"
          />
          <RoleCard
            title="I’m a Dispatcher"
            eyebrow="Dispatcher preview"
            description="Track active drivers, receive emergencies, review route decisions, and monitor the same driver tools from an operations point of view."
            icon={Users}
            onClick={() => onSelectRole('dispatcher')}
            accent="border-sky-300/20 bg-gradient-to-br from-[#12243a] via-[#171b2c] to-[#23172a] text-[#eff7ff]"
          />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#111726]/85 p-6">
            <div className="flex items-center gap-3">
              <Route size={18} className="text-[#7dd3fc]" />
              <h2 className="text-lg font-semibold">NavPro-informed feature foundation</h2>
            </div>
            <div className="mt-5 grid gap-3">
              {navProCapabilityNotes.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-white/65">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#1b1420]/85 p-6">
            <div className="flex items-center gap-3">
              <MessageSquareWarning size={18} className="text-[#f59e0b]" />
              <h2 className="text-lg font-semibold">Phase 1 scope</h2>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-white/72">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                Separate buttons for trip planning, route choices, HOS, rest, fuel, nearby drivers, AI chat, and emergency.
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                Driver dashboard first, dispatcher dashboard second, with a clear shared emergency workflow.
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                Real API integration can plug into the prepared connection layer once your TruckerPath/NavPro auth details are added.
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm text-amber-50/85">
              <Fuel size={16} />
              Fuel, parking, and route support are highlighted because they map well to Trucker Path’s public fleet navigation feature set.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
