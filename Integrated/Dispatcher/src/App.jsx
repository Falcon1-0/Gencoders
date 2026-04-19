import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import SettingsDrawer from './components/SettingsDrawer.jsx'
import { sidebarLinks } from './data/mockData.js'
import CostPage from './pages/CostPage.jsx'
import DispatchPage from './pages/DispatchPage.jsx'

const STORAGE_KEY = 'fleetmind-demo-settings'

function getInitialSettings() {
  if (typeof window === 'undefined') {
    return {
      preferElevenLabs: false,
      elevenLabsKey: '',
      voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      useLiveWeather: true,
    }
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return {
      preferElevenLabs: false,
      elevenLabsKey: '',
      voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      useLiveWeather: true,
    }
  }

  try {
    return JSON.parse(stored)
  } catch {
    return {
      preferElevenLabs: false,
      elevenLabsKey: '',
      voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      useLiveWeather: true,
    }
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dispatch')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState(getInitialSettings)
  const [embedMode, setEmbedMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('embed') === '1'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(voiceSettings))
    }
  }, [voiceSettings])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (embedMode) {
      url.searchParams.set('embed', '1')
    } else {
      url.searchParams.delete('embed')
    }
    window.history.replaceState({}, '', url)
  }, [embedMode])

  const voiceMode = useMemo(() => {
    if (voiceSettings.preferElevenLabs && voiceSettings.elevenLabsKey) return 'ElevenLabs voice'
    return 'Browser speech'
  }, [voiceSettings])

  function renderPage() {
    if (activeTab === 'cost') {
      return <CostPage voiceSettings={voiceSettings} />
    }
    return <DispatchPage voiceSettings={voiceSettings} />
  }

  return (
    <div className="min-h-screen text-command-ink">
      <div className="absolute inset-0 bg-command-grid grid-overlay opacity-30" />
      <div className="relative flex min-h-screen">
        <Sidebar
          links={sidebarLinks}
          activeTab={activeTab}
          onChange={setActiveTab}
          embedMode={embedMode}
        />

        <div className="min-w-0 flex-1">
          <TopBar
            tabs={sidebarLinks}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            embedMode={embedMode}
            voiceMode={voiceMode}
            onToggleEmbed={() => setEmbedMode((current) => !current)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
            {renderPage()}
          </main>
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        settings={voiceSettings}
        onClose={() => setSettingsOpen(false)}
        onChange={(key, value) => setVoiceSettings((current) => ({ ...current, [key]: value }))}
      />
    </div>
  )
}
