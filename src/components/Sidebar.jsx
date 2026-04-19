import { Activity, DollarSign, LayoutGrid, ShieldCheck } from 'lucide-react'
import BrandMark from './BrandMark.jsx'

const iconMap = {
  dispatch: LayoutGrid,
  cost: DollarSign,
}

export default function Sidebar({ links, activeTab, onChange, embedMode }) {
  if (embedMode) {
    return null
  }

  return (
    <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col border-r border-white/10 bg-command-panel/50 px-6 py-7 lg:flex">
      <BrandMark />

      <div className="mt-8 grid gap-3">
        <div className="panel-muted p-4">
          <div className="eyebrow">Why this wins</div>
          <p className="mt-2 text-sm leading-6 text-command-ink/80">
            This prototype sits on top of existing Trucker Path data and adds the missing decision layer: who to assign, why cost is rising, and what action to take next.
          </p>
        </div>
      </div>

      <nav className="mt-8 grid gap-2">
        {links.map((link) => {
          const Icon = iconMap[link.id] || Activity
          const active = activeTab === link.id
          return (
            <button
              key={link.id}
              onClick={() => onChange(link.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? 'border-command-cyan/30 bg-command-blue/20 text-white shadow-glow'
                  : 'border-white/5 bg-white/0 text-command-ink/70 hover:border-command-cyan/20 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  active ? 'bg-command-cyan/20 text-command-cyan' : 'bg-white/5 text-command-slate'
                }`}
              >
                <Icon size={18} />
              </span>
              <div>
                <div className="font-semibold">{link.label}</div>
                <div className="text-xs uppercase tracking-[0.22em] text-command-slate">
                  {link.id === 'dispatch' ? 'Driver assignment' : 'Why cost is rising'}
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="panel-muted flex items-center gap-3 p-4">
          <div className="rounded-xl bg-command-cyan/10 p-2 text-command-cyan">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Demo-safe mode</div>
            <div className="text-xs text-command-slate">Works fully with local logic even if no API key is set</div>
          </div>
        </div>

        <div className="panel-muted flex items-center gap-3 p-4">
          <div className="rounded-xl bg-command-green/10 p-2 text-command-green">
            <Activity size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Voice-ready</div>
            <div className="text-xs text-command-slate">Browser speech by default, ElevenLabs optional</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
