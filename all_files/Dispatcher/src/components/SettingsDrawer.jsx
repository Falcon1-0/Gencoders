import { X } from 'lucide-react'

export default function SettingsDrawer({ open, settings, onChange, onClose }) {
  return (
    <div className={`fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 transition ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md transform border-l border-white/10 bg-command-panel p-6 shadow-panel transition ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Settings</div>
            <h3 className="mt-1 text-2xl font-semibold text-white">Demo controls</h3>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            <X size={14} />
            Close
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="panel-muted p-4">
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-white">Use ElevenLabs</div>
                <div className="mt-1 text-sm text-command-slate">If off, the browser speech engine is used for free.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.preferElevenLabs}
                onChange={(event) => onChange('preferElevenLabs', event.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-transparent"
              />
            </label>
          </div>

          <div className="panel-muted p-4">
            <label className="data-label">ElevenLabs API key</label>
            <input
              type="password"
              value={settings.elevenLabsKey}
              onChange={(event) => onChange('elevenLabsKey', event.target.value)}
              placeholder="Paste demo key here"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-command-bg/80 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-command-slate"
            />
            <p className="mt-2 text-xs leading-6 text-command-slate">Stored only in your browser for the demo. Leave blank if you want to stay fully free.</p>
          </div>

          <div className="panel-muted p-4">
            <label className="data-label">Voice ID</label>
            <input
              type="text"
              value={settings.voiceId}
              onChange={(event) => onChange('voiceId', event.target.value)}
              placeholder="11 labs voice id"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-command-bg/80 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-command-slate"
            />
          </div>

          <div className="panel-muted p-4">
            <label className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-white">Use live weather</div>
                <div className="mt-1 text-sm text-command-slate">Pulls current lane weather from the free Open-Meteo API.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.useLiveWeather}
                onChange={(event) => onChange('useLiveWeather', event.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-transparent"
              />
            </label>
          </div>
        </div>
      </aside>
    </div>
  )
}
