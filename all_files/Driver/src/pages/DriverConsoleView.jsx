import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BedDouble,
  Bot,
  Check,
  ExternalLink,
  Fuel,
  HeartPulse,
  MapPin,
  MapPinned,
  Maximize2,
  Mic,
  Minimize2,
  Navigation,
  Route,
  ShieldPlus,
  ShieldAlert,
  TimerReset,
  Truck,
  Users,
  Waves,
  X
} from 'lucide-react'
import { getNavProConnection } from '../api/navProApi.js'
import truckImage from '../assets/images.png'
import {
  agentSystem,
  chatSuggestions,
  driverProfile,
  emergencyContacts,
  fuelIntel,
  hosTimeline,
  liveRoutePulse,
  nearbyDrivers,
  nearbyRouteServices,
  nearbyServiceOptions,
  nextLoadHotspots,
  restStops,
  routeOptions,
  tripDraft
} from '../data/driverConsoleData.js'

const FOCUS_TABS = [
  { id: 'navigation', label: 'Navigation', icon: Navigation },
  { id: 'demand', label: 'Demand', icon: Route },
  { id: 'load', label: 'Load', icon: Fuel },
  { id: 'nearby', label: 'Nearby', icon: Users },
  { id: 'emergency', label: 'Emergency', icon: ShieldAlert },
  { id: 'profile', label: 'Profile', icon: TimerReset }
]

function MiniStat({ label, value, detail, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-white/10 bg-white/[0.03]',
    success: 'border-emerald-300/18 bg-emerald-300/10',
    warning: 'border-amber-300/18 bg-amber-300/10',
    danger: 'border-rose-300/18 bg-rose-300/10'
  }

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone] || tones.neutral}`}>
      <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      {detail && <div className="mt-1 text-xs text-white/55">{detail}</div>}
    </div>
  )
}

function FocusToggle({ active, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-colors ${
        active
          ? 'border-emerald-300/25 bg-emerald-300/12 text-white'
          : 'border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.05]'
      }`}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  )
}

function formatHours(hours) {
  const whole = Math.floor(hours)
  const minutes = Math.round((hours - whole) * 60)
  return `${String(whole).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

function getTruckerPathRouteUrl(destinationCoords, sourceCoords, waypointCoords = []) {
  if (!destinationCoords) return '#'

  const waypointSegment = waypointCoords.length
    ? `&paddr=${waypointCoords.map((point) => `${point.lat},${point.lng}`).join('|')}`
    : ''

  return `truckerpath://cal_route?saddr=${sourceCoords.lat},${sourceCoords.lng}&daddr=${destinationCoords.lat},${destinationCoords.lng}${waypointSegment}`
}

function getMapEmbedUrl(focus, selectedRoute, selectedLoad, telemetry) {
  return selectedRoute.mapUrl
}

function formatCurrency(value) {
  return `$${value.toLocaleString()}`
}

function getCallHref(phoneNumber) {
  return `tel:${phoneNumber.replace(/[^\d+]/g, '')}`
}

function interpolateRoutePoint(points, progress) {
  if (!points?.length) return { top: 72, left: 16 }
  if (points.length === 1) return points[0]

  const clamped = Math.min(1, Math.max(0, progress))
  const scaled = clamped * (points.length - 1)
  const index = Math.floor(scaled)
  const remainder = scaled - index
  const start = points[index]
  const end = points[Math.min(index + 1, points.length - 1)]

  return {
    top: start.top + (end.top - start.top) * remainder,
    left: start.left + (end.left - start.left) * remainder
  }
}

function VehicleCallout({ label, value, detail, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'border-white/12 bg-[#0d141d]/92 text-white',
    success: 'border-emerald-300/22 bg-emerald-300/10 text-emerald-50',
    warning: 'border-amber-300/22 bg-amber-300/10 text-amber-50',
    danger: 'border-rose-300/22 bg-rose-300/10 text-rose-50'
  }

  return (
    <div className={`rounded-2xl border px-3 py-2.5 shadow-[0_18px_30px_rgba(0,0,0,0.24)] ${tones[tone] || tones.neutral} ${className}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/48">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
      {detail && <div className="mt-1 text-[11px] text-white/58">{detail}</div>}
    </div>
  )
}

function Truck3DCanvas({ telemetry, pulseIndex }) {
  const oilTemp = 93 + (pulseIndex % 4)
  const coolantTemp = 87 + (pulseIndex % 3)
  const batteryVoltage = (13.6 + ((pulseIndex % 3) * 0.1)).toFixed(1)
  const brakeWear = 72 + (pulseIndex % 5)
  const tireSet = [
    110 + (pulseIndex % 2),
    112 - (pulseIndex % 2),
    108 + (pulseIndex % 3),
    109,
    106 + (pulseIndex % 2),
    107
  ]

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.1),transparent_28%),linear-gradient(180deg,#0d1722_0%,#0a1118_100%)] p-3 sm:p-4">
      <div className="rounded-[30px] border border-white/10 bg-[#11171f]/96 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.26em] text-white/46">Vehicle status</div>
            <div className="mt-1 text-xl font-semibold text-white">{driverProfile.truckName}</div>
            <div className="mt-1 text-sm text-white/56">{driverProfile.truckId} · {driverProfile.truckType}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/42">Current location</div>
            <div className="mt-1 text-sm font-medium text-white">{telemetry.location}</div>
          </div>
        </div>

        <div className="mt-4 relative rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#151d27_0%,#0b1218_100%)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(26,43,43,0.4)_0%,rgba(26,43,43,0.18)_28%,transparent_62%)]" />

          <div className="relative z-20 grid min-h-[620px] items-center gap-4 px-4 py-5 lg:grid-cols-[1fr_2fr_1fr] lg:grid-rows-[auto_auto]">
            <div className="grid content-center gap-3">
              <VehicleCallout
                label="Engine oil"
                value={`${oilTemp}°C`}
                detail="Normal operating band"
                tone="success"
                className="max-w-none"
              />
              <VehicleCallout
                label="Fuel"
                value={`${telemetry.fuelPercent}%`}
                detail={`${telemetry.range} mi remaining`}
                tone={telemetry.fuelPercent <= driverProfile.alarmThreshold ? 'danger' : 'warning'}
                className="max-w-none"
              />
              <VehicleCallout
                label="Cab security"
                value={driverProfile.doorsLocked ? 'Locked' : 'Unlocked'}
                detail="Driver cabin"
                tone={driverProfile.doorsLocked ? 'success' : 'danger'}
                className="max-w-none"
              />
            </div>

            <div className="relative row-span-1 flex min-h-[360px] items-center justify-center px-8 py-10 lg:px-12">
              <div className="absolute inset-x-[18%] top-[16%] bottom-[20%] z-0 rounded-full bg-[radial-gradient(circle,rgba(26,43,43,0.4)_0%,rgba(26,43,43,0.18)_32%,transparent_70%)] blur-2xl" />
              <div className="absolute inset-x-[16%] bottom-[12%] z-0 h-12 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.18),transparent_70%)] blur-xl" />
              <div className="absolute inset-x-[20%] bottom-[10%] z-0 h-6 rounded-full bg-black/50 blur-2xl" />
              <div
                id="truck-container"
                className="relative z-10 isolate flex h-full w-full items-center justify-center bg-transparent px-2 py-6 lg:px-4"
              >
                <img
                  src={truckImage}
                  alt="Truck"
                  className="h-auto max-h-[360px] w-auto max-w-[120%] bg-transparent object-contain [mix-blend-mode:multiply] [filter:brightness(1.08)_contrast(1.36)_saturate(0.94)_drop-shadow(0_28px_34px_rgba(0,0,0,0.52))]"
                />
              </div>
            </div>

            <div className="grid content-center gap-3">
              <VehicleCallout
                label="Coolant"
                value={`${coolantTemp}°C`}
                detail="Cooling stable"
                tone="success"
                className="max-w-none"
              />
              <VehicleCallout
                label="Battery"
                value={`${batteryVoltage}V`}
                detail={driverProfile.batteryHealth}
                tone="success"
                className="max-w-none"
              />
              <VehicleCallout
                label="Trailer"
                value={driverProfile.trailerLocked ? 'Locked' : 'Unlocked'}
                detail="Cargo bay secured"
                tone={driverProfile.trailerLocked ? 'success' : 'danger'}
                className="max-w-none"
              />
            </div>

            <div className="col-span-full grid gap-3 pt-2 md:grid-cols-4">
              <MiniStat label="Tires" value={`${tireSet[0]}/${tireSet[1]} psi`} detail={driverProfile.tirePressure} />
              <MiniStat label="Brake pad wear" value={`${brakeWear}%`} detail="Serviceable" tone="success" />
              <MiniStat label="Engine" value={driverProfile.engineHealth} detail={`Speed ${telemetry.speed} mph`} tone="success" />
              <MiniStat label="Current load" value={`$${driverProfile.currentLoadPayout.toLocaleString()}`} detail={tripDraft.cargoPriority} tone="success" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DriverProfileCanvas() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_26%),linear-gradient(180deg,#0d1722_0%,#0a1118_100%)]">
      <div className="flex h-full items-center justify-center p-8">
        <div className="grid w-full max-w-[900px] gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-white/10 bg-[#111827]/92 p-6">
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.35),transparent_45%),linear-gradient(180deg,#1c2430_0%,#0d1218_100%)] text-6xl font-semibold text-white">
              MT
            </div>
            <div className="mt-5 text-center">
              <div className="text-2xl font-semibold text-white">{driverProfile.name}</div>
              <div className="mt-1 text-sm text-white/58">Driver of the month · Rating {driverProfile.safetyRating}</div>
            </div>
          </div>
          <div className="grid gap-4">
            <MiniStat label="Truck assigned" value={driverProfile.truckName} detail={driverProfile.truckId} />
            <MiniStat label="Weekly score" value={driverProfile.weeklyScore} detail="Performance and safety insight" tone="success" />
            <MiniStat label="HOS remaining" value={driverProfile.hosRemaining} detail={driverProfile.dutyStatus} tone="warning" />
            <MiniStat label="Completed week" value={`$${driverProfile.completedEarningsThisWeek.toLocaleString()}`} detail="Past completed loads" />
            <MiniStat label="Current trip" value={`$${driverProfile.currentLoadPayout.toLocaleString()}`} detail="In-progress load earnings" tone="success" />
            <MiniStat label="Compliance" value="In compliance" detail="Profile agent watching HOS and safety state" tone="success" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MapCanvas({ focus, telemetry, selectedRoute, selectedLoadId, onSelectLoad, nearbyType, pulseIndex }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const selectedLoad = nextLoadHotspots.find((item) => item.id === selectedLoadId) || nextLoadHotspots[0]
  const embedUrl = getMapEmbedUrl(focus, selectedRoute, selectedLoad, telemetry)
  const totalRouteCost = selectedRoute.estimatedFuelCost + selectedRoute.tollCost

  const loadPositions = {
    'dallas-retail': { top: 31, left: 74 },
    'fort-worth-warehouse': { top: 37, left: 64 },
    'amarillo-regional': { top: 24, left: 39 },
    'okc-grocery': { top: 26, left: 60 },
    'wichita-manufacturing': { top: 32, left: 69 },
    'little-rock-freight': { top: 29, left: 84 }
  }

  const showRoute = focus === 'navigation'
  const showDemand = focus === 'demand'
  const showLoad = focus === 'load'
  const showNearby = focus === 'nearby'
  const showEmergency = focus === 'emergency'
  const showProfile = focus === 'profile'
  const activeRoutePoints = selectedRoute.overlayPath || []
  const visibleNearbyServices = nearbyRouteServices.filter((service) => service.type === nearbyType)
  const nearbyMarkerConfig = {
    fuel: { icon: Fuel, badge: 'bg-amber-400 text-black' },
    restroom: { icon: MapPin, badge: 'bg-cyan-300 text-black' },
    driver: { icon: Truck, badge: 'bg-sky-300 text-black' },
    hospital: { icon: HeartPulse, badge: 'bg-rose-400 text-white' },
    resthouse: { icon: BedDouble, badge: 'bg-emerald-300 text-black' }
  }

  return (
    <div className={`${isExpanded ? 'fixed inset-4 z-50' : 'overflow-visible'} rounded-[32px] border border-white/10 bg-[#0b121b] shadow-[0_30px_80px_rgba(0,0,0,0.45)]`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-white/42">Central canvas</div>
          <div className="mt-1 text-xl font-semibold text-white">
            {showLoad ? 'Live vehicle dashboard' : showProfile ? 'Driver profile view' : 'Persistent live route map'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-sky-300/18 bg-sky-300/10 px-4 py-2 text-sm text-sky-50">
            Focus: {FOCUS_TABS.find((tab) => tab.id === focus)?.label}
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(tripDraft.source)}&destination=${encodeURIComponent(tripDraft.destination)}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/78 transition-colors hover:bg-white/[0.08] hover:text-white"
            title="Open interactive map"
          >
            <ExternalLink size={16} />
          </a>
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/78 transition-colors hover:bg-white/[0.08] hover:text-white"
            title={isExpanded ? 'Collapse map' : 'Expand map'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div className={`relative bg-[#0b121b] ${isExpanded ? 'h-[calc(100vh-7rem)]' : 'h-[560px]'}`}>
        {!showLoad && !showProfile && (
          <>
            <iframe
              title="Live map canvas"
              src={embedUrl}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,60,54,0.14),transparent_24%),linear-gradient(160deg,rgba(17,24,39,0.16)_0%,rgba(12,22,33,0.1)_55%,rgba(11,16,24,0.18)_100%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-24">
              <div className="absolute left-[9%] top-[16%] h-px w-[74%] rotate-[11deg] bg-white/15" />
              <div className="absolute left-[17%] top-[50%] h-px w-[56%] rotate-[-9deg] bg-white/12" />
              <div className="absolute left-[34%] top-[12%] h-[66%] w-px bg-white/10" />
              <div className="absolute left-[67%] top-[10%] h-[70%] w-px bg-white/10" />
              <div className="absolute left-[48%] top-[20%] h-[56%] w-px rotate-[24deg] bg-white/8" />
            </div>

            <div className="pointer-events-none absolute left-[13%] top-[76%] text-xs uppercase tracking-[0.24em] text-white/24">Phoenix</div>
            <div className="pointer-events-none absolute left-[37%] top-[18%] text-xs uppercase tracking-[0.24em] text-white/24">Amarillo</div>
            <div className="pointer-events-none absolute left-[61%] top-[34%] text-xs uppercase tracking-[0.24em] text-white/24">Fort Worth</div>
            <div className="pointer-events-none absolute left-[73%] top-[28%] text-xs uppercase tracking-[0.24em] text-white/24">Dallas</div>
          </>
        )}

        {showLoad && <Truck3DCanvas telemetry={telemetry} pulseIndex={pulseIndex} />}
        {showProfile && <DriverProfileCanvas />}

        {showRoute && selectedRoute.incidentTags?.map((tag) => (
          <div
            key={tag.id}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${tag.top}%`, left: `${tag.left}%` }}
          >
            <div className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] ${
              tag.tone === 'danger'
                ? 'border-rose-300/20 bg-rose-500/18 text-rose-50'
                : tag.tone === 'success'
                ? 'border-emerald-300/20 bg-emerald-300/14 text-emerald-50'
                : 'border-amber-300/20 bg-amber-300/16 text-amber-50'
            }`}>
              {tag.label}
            </div>
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#091018]/88 px-3 py-2 text-xs text-white/74">
              {tag.detail}
            </div>
          </div>
        ))}

        {showRoute && selectedRoute.fuelTags?.map((tag) => (
          <div
            key={tag.id}
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${tag.top}%`, left: `${tag.left}%` }}
          >
            <div className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] ${
              tag.tone === 'danger'
                ? 'border-rose-300/20 bg-rose-500/18 text-rose-50'
                : tag.tone === 'success'
                ? 'border-emerald-300/20 bg-emerald-300/14 text-emerald-50'
                : tag.tone === 'warning'
                ? 'border-amber-300/20 bg-amber-300/16 text-amber-50'
                : 'border-white/12 bg-black/25 text-white/82'
            }`}>
              {tag.label}
            </div>
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#091018]/88 px-3 py-2 text-xs text-white/74">
              {tag.detail}
            </div>
          </div>
        ))}

        {showDemand && nextLoadHotspots.map((load) => {
          const position = loadPositions[load.id]
          const isSelected = selectedLoad.id === load.id
          return (
            <button
              key={load.id}
              type="button"
              onClick={() => onSelectLoad(load.id)}
              className="group absolute z-10 text-left"
              style={{ top: `${position.top}%`, left: `${position.left}%` }}
            >
              <div className={`relative h-6 w-6 rounded-full border border-white/20 bg-black shadow-[0_0_0_6px_rgba(255,255,255,0.04)] ${isSelected ? 'ring-2 ring-white/45' : ''}`} />
              <div className={`absolute left-1/2 top-full mt-3 w-60 -translate-x-1/2 rounded-3xl border border-white/10 bg-[#091018]/95 p-4 backdrop-blur ${isSelected ? 'block' : 'hidden group-hover:block'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">{load.city}</div>
                    <div className="mt-1 text-sm text-white/58">{load.freight}</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-50">
                    {load.projectedNet}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    load.hosRequestReady ? 'bg-emerald-400 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    {load.hosRequestReady ? <Check size={16} /> : <X size={16} />}
                  </div>
                  <div className="text-xs text-white/74">
                    {load.hosRequestReady ? 'HOS complete. Driver can request this load now.' : `HOS not complete. Ready in ${load.hosReadyIn}.`}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat label="Loads" value={load.activeLoads} />
                  <MiniStat label="HOS Ready" value={load.hosReadyIn} />
                </div>
              </div>
            </button>
          )
        })}

        {showNearby && visibleNearbyServices.map((service) => (
          <div
            key={service.id}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${service.top}%`, left: `${service.left}%` }}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/60 shadow-[0_0_0_6px_rgba(255,255,255,0.04)] ${nearbyMarkerConfig[service.type]?.badge || 'bg-white/80 text-black'}`}>
              {(() => {
                const Icon = nearbyMarkerConfig[service.type]?.icon || ShieldPlus
                return <Icon size={16} />
              })()}
            </div>
            <div className="mt-2 rounded-full border border-white/10 bg-[#091018]/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white/72">
              {service.name}
            </div>
          </div>
        ))}

        {showEmergency && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-rose-500/10" />
            <div className="pointer-events-none absolute left-1/2 top-6 z-20 w-[min(520px,calc(100%-3rem))] -translate-x-1/2 rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(127,29,29,0.92),rgba(17,24,39,0.9))] px-6 py-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.28em] text-rose-100/70">Emergency response active</div>
              <div className="mt-2 text-2xl font-semibold text-white">Calm down, we are reaching you.</div>
              <div className="mt-2 text-sm text-rose-50/78">
                Dispatcher, nearby support driver, and emergency services have the live location.
              </div>
            </div>
            <div className="absolute right-6 top-36 z-20 w-80 rounded-[28px] border border-rose-300/20 bg-[#1a0e14]/90 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <ShieldAlert size={18} className="text-rose-300" />
                <div className="text-lg font-semibold text-white">Emergency escalation ready</div>
              </div>
              <div className="mt-4 space-y-3">
                {emergencyContacts.map((contact) => (
                  <a
                    key={contact.label}
                    href={getCallHref(contact.callNumber)}
                    className="block rounded-2xl border border-white/8 bg-black/10 px-4 py-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">{contact.label}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{contact.value}</div>
                    <div className="mt-2 text-xs text-rose-100/70">Tap to call</div>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {!isExpanded && !showLoad && !showProfile && (
        <div className="border-t border-white/10 bg-[#091018] px-5 py-4">
          <div className="grid gap-3 md:grid-cols-[1.25fr_1fr_1fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/15 text-white">
                  <Truck size={20} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white/62">{selectedRoute.label}</div>
                  <div className="text-xl font-semibold text-white">{formatCurrency(totalRouteCost)}</div>
                  <div className="text-sm text-white/55">Total path cost</div>
                </div>
              </div>
            </div>
            <MiniStat label="Truck" value={telemetry.location} detail="Live GPS pulse" />
            <MiniStat label="Distance" value={`${selectedRoute.mileage} mi`} detail={selectedRoute.label} />
            <MiniStat label="Duration" value={selectedRoute.eta} detail="Selected route time" tone="success" />
            <MiniStat label="Fuel" value={`${telemetry.fuelPercent}%`} detail={`${telemetry.range} mi range`} tone={telemetry.fuelPercent <= driverProfile.alarmThreshold ? 'danger' : 'warning'} />
          </div>
        </div>
      )}
    </div>
  )
}

function LeftPanel({ focus, telemetry, selectedRoute, onSelectRoute, nearbyType, setNearbyType }) {
  if (focus === 'navigation') {
    return (
      <div className="space-y-3">
        {routeOptions.map((route) => (
          <button
            key={route.id}
            type="button"
            onClick={() => onSelectRoute(route.id)}
            className={`w-full rounded-3xl border p-4 text-left ${selectedRoute.id === route.id ? 'border-sky-300/20 bg-sky-300/10' : 'border-white/10 bg-white/[0.03]'}`}
          >
            <div className="text-sm font-semibold text-white">{route.label}</div>
            <div className="mt-1 text-sm text-white/58">{route.summary}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/62">
              <span>{route.eta}</span>
              <span>{route.blockage}</span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  if (focus === 'demand') {
    return (
      <div className="space-y-3">
        {nextLoadHotspots.map((load) => (
          <div key={load.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{load.city}</div>
                <div className="mt-1 text-sm text-white/58">{load.freight}</div>
              </div>
              <div className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-50">
                {load.projectedNet}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniStat label="Loads" value={load.activeLoads} />
              <MiniStat label="HOS Ready" value={load.hosReadyIn} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (focus === 'load') {
    return (
      <div className="space-y-3">
        <MiniStat label="Truck" value={driverProfile.truckName} detail={driverProfile.truckId} />
        <MiniStat label="Location" value={telemetry.location} detail="Live truck position" />
        <MiniStat label="Load" value={tripDraft.cargo} detail={tripDraft.deliveryType} tone="success" />
      </div>
    )
  }

  if (focus === 'nearby') {
    return (
      <div className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Nearby along route</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {nearbyServiceOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setNearbyType(option.id)}
                className={`rounded-full border px-3 py-2 text-xs transition-colors ${
                  nearbyType === option.id ? 'border-sky-300/20 bg-sky-300/10 text-sky-50' : 'border-white/10 bg-black/10 text-white/72'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {nearbyRouteServices.filter((item) => item.type === nearbyType).map((item) => (
          <div key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-semibold text-white">{item.name}</div>
            <div className="mt-1 text-sm text-white/58">{item.detail}</div>
          </div>
        ))}
      </div>
    )
  }

  if (focus === 'emergency') {
    return (
      <div className="space-y-3">
        {emergencyContacts.map((contact) => (
          <a
            key={contact.label}
            href={getCallHref(contact.callNumber)}
            className="block rounded-3xl border border-rose-300/18 bg-rose-300/10 p-4 transition-colors hover:bg-rose-300/14"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-rose-100/58">{contact.label}</div>
            <div className="mt-1 text-sm font-semibold text-white">{contact.value}</div>
            <div className="mt-1 text-xs text-white/58">{contact.note}</div>
            <div className="mt-2 text-xs text-rose-50/75">Tap to call</div>
          </a>
        ))}
      </div>
    )
  }

  if (focus === 'communication') {
    return (
      <div className="space-y-3">
        {agentSystem.voiceCommands.map((command) => (
          <div key={command} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/74">
            {command}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <MiniStat label="Driver" value={driverProfile.name} detail={`Rating ${driverProfile.safetyRating}`} tone="success" />
      {hosTimeline.map((item) => (
        <MiniStat key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  )
}

function RightPanel({
  focus,
  telemetry,
  selectedRoute,
  selectedLoad,
  setSelectedLoadId,
  nearbyType,
  incomingLoadAssignment,
  assignmentDecision,
  onAcceptAssignment,
  onRejectAssignment
}) {
  if (focus === 'demand') {
    const selectedEarnings = parseInt(selectedLoad.projectedNet.replace(/[^0-9]/g, ''), 10)
    const weeklyBase = driverProfile.completedEarningsThisWeek + driverProfile.currentLoadPayout
    const assignmentReady = incomingLoadAssignment.hosRequestReady

    return (
      <div className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(9,16,24,0.96))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Incoming assignment</div>
              <div className="mt-1 text-lg font-semibold text-white">{incomingLoadAssignment.city}</div>
            </div>
            <div className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-50">
              {incomingLoadAssignment.payout}
            </div>
          </div>
          <div className="mt-2 text-sm text-white/62">
            {incomingLoadAssignment.freight} · {incomingLoadAssignment.lane}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat
              label="Pickup"
              value={assignmentReady ? incomingLoadAssignment.pickupWindow : 'Blocked until HOS clears'}
              detail={assignmentReady ? 'HOS compliant for dispatch' : `HOS ready in ${incomingLoadAssignment.hosReadyIn}`}
              tone={assignmentReady ? 'success' : 'danger'}
            />
            <MiniStat label="Distance" value={incomingLoadAssignment.deadhead} />
          </div>
          {assignmentDecision ? (
            <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              assignmentDecision === 'accepted'
                ? 'border-emerald-300/18 bg-emerald-300/10 text-emerald-50'
                : 'border-rose-300/18 bg-rose-500/10 text-rose-50'
            }`}>
              {assignmentDecision === 'accepted'
                ? 'Load assignment accepted. Dispatcher has been notified.'
                : 'Load assignment declined. Dispatcher has been notified.'}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onRejectAssignment}
                className="rounded-full border border-rose-300/28 bg-rose-500/18 px-4 py-3 text-sm font-semibold text-rose-50 transition-colors hover:bg-rose-500/26"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onAcceptAssignment}
                disabled={!assignmentReady}
                className={`rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${
                  assignmentReady
                    ? 'border-emerald-300/28 bg-emerald-400/22 text-emerald-50 hover:bg-emerald-400/30'
                    : 'cursor-not-allowed border-white/10 bg-white/[0.04] text-white/38'
                }`}
              >
                Accept
              </button>
            </div>
          )}
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Selected reload</div>
          <div className="mt-1 text-xl font-semibold text-white">{selectedLoad.city}</div>
          <div className="mt-2 text-sm text-white/58">{selectedLoad.freight} on {selectedLoad.lane}</div>
          <div className="mt-4 grid gap-3">
            <button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90">
              {selectedLoad.requestLabel}
            </button>
            <a
              href={getTruckerPathRouteUrl(selectedLoad.coords, tripDraft.destinationCoords)}
              className="block w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-center text-sm text-white/78 transition-colors hover:bg-white/[0.05]"
            >
              Open this load in Trucker Path
            </a>
          </div>
        </div>
        <MiniStat label="Projected next trip" value={selectedLoad.projectedNet} detail={selectedLoad.avgRate} tone="success" />
        <MiniStat label="This week total" value={`$${(weeklyBase + selectedEarnings).toLocaleString()}`} detail="Completed + current + selected next load" tone="success" />
      </div>
    )
  }

  if (focus === 'navigation') {
    const totalCost = selectedRoute.estimatedFuelCost + selectedRoute.tollCost
    return (
      <div className="space-y-3">
        <MiniStat label="ETA" value={selectedRoute.eta} detail="Current best route" tone="success" />
        <MiniStat label="Traffic" value={telemetry.traffic} detail={`ETA shift ${telemetry.etaShiftMinutes}m`} tone="warning" />
        <MiniStat label="Cost" value={formatCurrency(totalCost)} detail="Fuel + toll estimate" />
        <MiniStat label="Blockage" value={selectedRoute.blockage} detail="Live monitor" tone={selectedRoute.risk === 'alert' ? 'danger' : 'warning'} />
        <a
          href={getTruckerPathRouteUrl(tripDraft.destinationCoords, tripDraft.sourceCoords, selectedRoute.waypoints)}
          className="block rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-center text-sm text-white/78 transition-colors hover:bg-white/[0.05]"
        >
          Open route in Trucker Path
        </a>
      </div>
    )
  }

  if (focus === 'load') {
    return (
      <div className="space-y-3">
        <MiniStat label="Current trip" value={`$${driverProfile.currentLoadPayout.toLocaleString()}`} detail="Load payout" tone="success" />
        <MiniStat label="Best fuel stop" value={fuelIntel.bestStop} detail={fuelIntel.bestPrice} tone="success" />
        <MiniStat label="Status" value={driverProfile.emergencyHealth} detail="Core systems nominal" />
      </div>
    )
  }

  if (focus === 'nearby') {
    const nearbyCount = nearbyRouteServices.filter((item) => item.type === nearbyType).length
    const nearbyLabel = nearbyServiceOptions.find((item) => item.id === nearbyType)?.label || 'Nearby'
    return (
      <div className="space-y-3">
        <MiniStat label="Visible category" value={nearbyLabel} detail={`${nearbyCount} points on map`} tone="success" />
        <MiniStat label="Current corridor" value={telemetry.location} detail="Route-adjacent services only" />
        <MiniStat label="Map behavior" value="Along-route points" detail="Use the left filter to switch fuel, drivers, hospitals, restrooms, and rest houses" />
      </div>
    )
  }

  if (focus === 'emergency') {
    return (
      <div className="space-y-3">
        <button className="w-full rounded-3xl bg-[#b91c1c] px-4 py-4 text-left text-white transition-colors hover:bg-[#991b1b]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-rose-50/75">Critical action</div>
          <div className="mt-1 text-xl font-semibold">Trigger emergency</div>
        </button>
        <MiniStat label="Priority" value="Safety first" detail="Emergency agent overrides other agents" tone="danger" />
        <MiniStat label="Tracking" value={driverProfile.emergencyHealth} detail="Persistent live location" />
      </div>
    )
  }

  if (focus === 'communication') {
    return (
      <div className="space-y-3">
        <MiniStat label="Voice assistant" value="Listening" detail="Google Assistant-like command flow" tone="success" />
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Suggested commands</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {chatSuggestions.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs text-white/72">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <MiniStat label="Driver score" value={driverProfile.weeklyScore} detail="Profile Agent insight" tone="success" />
      <MiniStat label="Driver of month" value={driverProfile.driverOfMonth ? 'Yes' : 'No'} detail="Recognition active" />
      <MiniStat label="Completed week" value={`$${driverProfile.completedEarningsThisWeek.toLocaleString()}`} detail="Past completed loads" />
      <MiniStat label="Current trip" value={`$${driverProfile.currentLoadPayout.toLocaleString()}`} detail="Load in progress" tone="success" />
    </div>
  )
}

export default function DriverConsoleView({ onChangeRole, onOpenDispatcher }) {
  const [focus, setFocus] = useState('navigation')
  const [pulseIndex, setPulseIndex] = useState(0)
  const [selectedRouteId, setSelectedRouteId] = useState('traffic')
  const [selectedLoadId, setSelectedLoadId] = useState('dallas-retail')
  const [nearbyType, setNearbyType] = useState('fuel')
  const [assignmentDecision, setAssignmentDecision] = useState(null)
  const navProConnection = getNavProConnection()
  const telemetry = liveRoutePulse[pulseIndex % liveRoutePulse.length]
  const incomingLoadAssignment = {
    city: 'Memphis Priority Lane',
    payout: '$1,240',
    freight: 'Expedited electronics',
    lane: 'Little Rock to Memphis',
    pickupWindow: 'Pickup in 18 min',
    deadhead: '21 mi deadhead',
    hosRequestReady: false,
    hosReadyIn: '00h 34m'
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setPulseIndex((current) => (current + 1) % liveRoutePulse.length)
    }, 4500)

    return () => window.clearInterval(intervalId)
  }, [])

  const selectedRoute = useMemo(
    () => routeOptions.find((option) => option.id === selectedRouteId) || routeOptions[0],
    [selectedRouteId]
  )

  const selectedLoad = useMemo(
    () => nextLoadHotspots.find((item) => item.id === selectedLoadId) || nextLoadHotspots[0],
    [selectedLoadId]
  )

  const focusAgent = useMemo(
    () => agentSystem.agents.find((agent) => agent.id === focus) || agentSystem.agents[0],
    [focus]
  )
  const hideContextPanel = focus === 'demand'
  return (
    <div className="min-h-screen bg-app-shell text-white">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-8 lg:px-10">
        <header className="rounded-[32px] border border-white/10 bg-white/5 px-6 py-6 backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <button onClick={onChangeRole} className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">
                <ArrowLeft size={16} />
                Change role
              </button>
              <div className="mt-4 flex items-center gap-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123d35] text-[#8ef1d2]">
                  <Truck size={24} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">Agentic co-driver</div>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{driverProfile.name}</h1>
                </div>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">
                One central map canvas, horizontal agent toggles, and orchestrated live assistance across routing, demand, load health, nearby support, communication, profile, and emergency response.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <MiniStat label="Truck" value={driverProfile.truckId} detail={driverProfile.truckType} />
              <MiniStat label="Nav layer" value={navProConnection.label} detail={navProConnection.source === 'demo' ? 'Map canvas ready for real endpoint' : 'Live-ready'} tone="success" />
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-[#0c141d] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Waves size={16} className="text-emerald-300" />
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">{agentSystem.orchestrator.name}</div>
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">{agentSystem.orchestrator.mode}</div>
              <div className="mt-2 text-sm text-white/62">{focusAgent.status}</div>
            </div>
            <button
              onClick={onOpenDispatcher}
              className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-50 transition-colors hover:bg-sky-300/15"
            >
              Open dispatcher preview
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {FOCUS_TABS.map((tab) => (
              <FocusToggle
                key={tab.id}
                active={focus === tab.id}
                label={tab.label}
                icon={tab.icon}
                onClick={() => setFocus(tab.id)}
              />
            ))}
          </div>
        </section>

        <section className={`mt-6 grid gap-5 ${hideContextPanel ? 'xl:grid-cols-[1fr_280px]' : 'xl:grid-cols-[280px_1fr_280px]'}`}>
          {!hideContextPanel && (
            <aside className="rounded-[30px] border border-white/10 bg-[#111726]/88 p-5">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Context panel</div>
              <div className="mt-2 text-xl font-semibold text-white">{focusAgent.name}</div>
              <div className="mt-1 text-sm text-white/60">{focusAgent.summary}</div>
              <div className="mt-5">
                <LeftPanel
                  focus={focus}
                  telemetry={telemetry}
                  selectedRoute={selectedRoute}
                  onSelectRoute={setSelectedRouteId}
                  nearbyType={nearbyType}
                  setNearbyType={setNearbyType}
                />
              </div>
            </aside>
          )}

          <main>
            <MapCanvas
              focus={focus}
              telemetry={telemetry}
              selectedRoute={selectedRoute}
              selectedLoadId={selectedLoadId}
              onSelectLoad={setSelectedLoadId}
              nearbyType={nearbyType}
              pulseIndex={pulseIndex}
            />
          </main>

          <aside className="rounded-[30px] border border-white/10 bg-[#111726]/88 p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Action panel</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {focus === 'demand' ? 'Next-load actions' : focus === 'navigation' ? 'Route actions' : 'Agent actions'}
            </div>
            <div className="mt-5">
              <RightPanel
                focus={focus}
                telemetry={telemetry}
                selectedRoute={selectedRoute}
                selectedLoad={selectedLoad}
                setSelectedLoadId={setSelectedLoadId}
                nearbyType={nearbyType}
                incomingLoadAssignment={incomingLoadAssignment}
                assignmentDecision={assignmentDecision}
                onAcceptAssignment={() => setAssignmentDecision('accepted')}
                onRejectAssignment={() => setAssignmentDecision('rejected')}
              />
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
