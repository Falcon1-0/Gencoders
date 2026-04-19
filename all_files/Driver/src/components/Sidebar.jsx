import React from 'react'
import { Truck, Mic, BarChart2, Shield, Zap } from 'lucide-react'

const VIEW_ICONS = {
  dispatch: Truck,
  voice:    Mic,
  cost:     BarChart2
}

export default function Sidebar({ activeView, onNavigate, views }) {
  return (
    <aside className="w-56 flex-shrink-0 bg-navy-800 border-r border-navy-500 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-navy-500">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={16} className="text-sentinel-cyan" />
          <span className="text-xs font-bold tracking-widest text-sentinel-cyan uppercase">
            Command
          </span>
        </div>
        <div className="text-[10px] text-gray-500 tracking-widest uppercase pl-6">
          Sentinel AI
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-4 py-3 border-b border-navy-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sentinel-green sentinel-pulse" />
          <span className="text-[10px] text-gray-400 tracking-wide">8 trucks live</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-1 pl-4">
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} local
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {Object.entries(views).map(([key, view]) => {
          const Icon = VIEW_ICONS[key]
          const isActive = activeView === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded text-left
                text-xs tracking-wide transition-all duration-150
                ${isActive
                  ? 'bg-sentinel-cyan/10 text-sentinel-cyan border border-sentinel-cyan/30'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-navy-600 border border-transparent'
                }
              `}
            >
              <Icon size={14} className={isActive ? 'text-sentinel-cyan' : ''} />
              {view.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom badge */}
      <div className="px-4 py-4 border-t border-navy-500">
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-sentinel-amber" />
          <span className="text-[9px] text-gray-600 tracking-widest uppercase">
            TruckerPath COMMAND
          </span>
        </div>
      </div>
    </aside>
  )
}
