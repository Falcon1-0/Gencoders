import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { formatHos, getStatusColor, getStatusLabel } from '../utils/matchEngine.js'

// ── Status badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const styles = {
    available:   'bg-sentinel-green/10 text-sentinel-green   border-sentinel-green/25',
    in_transit:  'bg-sentinel-cyan/10   text-sentinel-cyan   border-sentinel-cyan/25',
    loading:     'bg-sentinel-amber/10  text-sentinel-amber  border-sentinel-amber/25',
    hos_warning: 'bg-sentinel-red/10    text-sentinel-red    border-sentinel-red/25',
    off_duty:    'bg-gray-700/40        text-gray-400        border-gray-600/30'
  }
  return (
    <span className={`
      inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase
      border rounded-sm ${styles[status] || styles.off_duty}
    `}>
      {getStatusLabel(status)}
    </span>
  )
}

// ── HOS progress bar ──────────────────────────────────────────────────────────
export function HosBar({ hours, maxHours = 11 }) {
  const pct = Math.min((hours / maxHours) * 100, 100)
  const color = pct > 50 ? '#00e096' : pct > 20 ? '#ffb347' : '#ff4d6d'
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] text-gray-500">HOS</span>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {formatHos(hours)}
        </span>
      </div>
      <div className="h-1 bg-navy-500 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full hos-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, color = 'text-sentinel-cyan', alert }) {
  return (
    <div className="bg-navy-700 border border-navy-500 rounded p-3">
      <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1.5">{label}</div>
      <div className={`text-2xl font-bold tracking-tight ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-1">{sub}</div>}
      {alert && (
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle size={10} className="text-sentinel-amber" />
          <span className="text-[10px] text-sentinel-amber">{alert}</span>
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ children, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] font-bold tracking-widest uppercase text-gray-500">{children}</h2>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Priority badge ────────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const styles = {
    urgent: 'bg-sentinel-red/10    text-sentinel-red    border-sentinel-red/30',
    high:   'bg-sentinel-amber/10  text-sentinel-amber  border-sentinel-amber/30',
    normal: 'bg-navy-500           text-gray-400        border-navy-400'
  }
  return (
    <span className={`
      inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase
      border rounded-sm ${styles[priority] || styles.normal}
    `}>
      {priority}
    </span>
  )
}

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      className="animate-spin text-sentinel-cyan"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-navy-500 bg-navy-800">
      <div>
        <h1 className="text-sm font-bold tracking-wider text-white uppercase">{title}</h1>
        {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── AI source indicator ───────────────────────────────────────────────────────
export function AiSourceBadge({ source }) {
  if (source === 'claude') {
    return (
      <span className="text-[9px] text-sentinel-cyan/60 tracking-widest uppercase">
        ◆ Claude AI
      </span>
    )
  }
  return (
    <span className="text-[9px] text-gray-600 tracking-widest uppercase">
      ◇ Demo mode
    </span>
  )
}
