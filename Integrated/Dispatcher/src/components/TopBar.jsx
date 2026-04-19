import { Menu, Settings2, Volume2, Waves } from 'lucide-react'
import BrandMark from './BrandMark.jsx'

export default function TopBar({
  activeTab,
  onTabChange,
  tabs,
  embedMode,
  voiceMode,
  onToggleEmbed,
  onOpenSettings,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-command-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {embedMode ? <BrandMark compact /> : <div className="lg:hidden"><BrandMark compact /></div>}
          <div className="hidden gap-2 md:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-command-cyan/20 text-command-cyan'
                    : 'text-command-ink/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="chip hidden md:flex">
            <Waves size={14} />
            {voiceMode}
          </div>
          <button
            onClick={onToggleEmbed}
            className="chip hidden md:inline-flex"
            type="button"
          >
            <Menu size={14} />
            {embedMode ? 'Exit embed' : 'Embed mode'}
          </button>
          <button onClick={onOpenSettings} className="chip" type="button">
            <Settings2 size={14} />
            Settings
          </button>
          <div className="chip hidden sm:inline-flex">
            <Volume2 size={14} />
            Stage-ready
          </div>
        </div>
      </div>
    </header>
  )
}
