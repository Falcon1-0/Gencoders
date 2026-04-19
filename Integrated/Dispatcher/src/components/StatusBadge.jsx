import { getStatusTone } from '../lib/formatters.js'

export default function StatusBadge({ status, pulse = false }) {
  const tone = getStatusTone(status)
  const toneMap = {
    green: 'border-command-green/25 bg-command-green/10 text-command-green',
    amber: 'border-command-amber/25 bg-command-amber/10 text-command-amber',
    red: 'border-command-red/25 bg-command-red/10 text-command-red',
    slate: 'border-white/10 bg-white/5 text-command-slate',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${toneMap[tone]} ${
        pulse && tone === 'red' ? 'animate-pulse-ring' : ''
      }`}
    >
      {status}
    </span>
  )
}
