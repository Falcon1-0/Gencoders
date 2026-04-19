import React, { useState } from 'react'
import { Mic, PhoneCall, Clock, CheckCircle, XCircle, Volume2 } from 'lucide-react'
import { drivers, loads } from '../data/mockData.js'
import { initiateVoiceCheckCall, CALL_STATES, getCallScript } from '../api/elevenLabsApi.js'
import { PageHeader, Spinner, StatusBadge } from '../components/UI.jsx'

// Pre-seeded call history for demo
const CALL_HISTORY = [
  {
    id: 'CALL-001',
    driverName: 'Raj Singh',
    route: 'Phoenix → Dallas',
    time: '09:14 AM',
    outcome: 'confirmed',
    transcript: '"Yes, I\'m ready. I have the hours and my truck is fueled up."',
    duration: '0:42'
  },
  {
    id: 'CALL-002',
    driverName: 'Maria Torres',
    route: 'Tucson → Los Angeles',
    time: '08:52 AM',
    outcome: 'confirmed',
    transcript: '"Confirmed, heading to pickup now. ETA 30 minutes."',
    duration: '0:38'
  },
  {
    id: 'CALL-003',
    driverName: 'Kevin Johnson',
    route: 'El Paso → San Antonio',
    time: '08:30 AM',
    outcome: 'declined',
    transcript: '"I need to rest. Almost out of hours — cannot take this load."',
    duration: '0:31'
  },
  {
    id: 'CALL-004',
    driverName: 'Priya Patel',
    route: 'Tucson → Dallas',
    time: '07:55 AM',
    outcome: 'confirmed',
    transcript: '"Yes, sending location now. Ready in 15 minutes."',
    duration: '0:45'
  }
]

export default function VoiceLogsView() {
  const [liveCall, setLiveCall] = useState(null)       // { driver, load, state, message }
  const [callHistory, setCallHistory] = useState(CALL_HISTORY)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedLoad, setSelectedLoad] = useState('')
  const [showScript, setShowScript] = useState(false)

  const availableDrivers = drivers.filter(d =>
    ['available', 'off_duty'].includes(d.status)
  )
  const pendingLoads = loads.filter(l => l.status === 'pending')

  const selectedDriverObj = drivers.find(d => d.id === selectedDriver)
  const selectedLoadObj   = loads.find(l => l.id === selectedLoad)

  const isCallActive = liveCall && [
    CALL_STATES.DIALING, CALL_STATES.CONNECTED, CALL_STATES.SPEAKING
  ].includes(liveCall.state)

  const handleInitiateCall = async () => {
    if (!selectedDriverObj || !selectedLoadObj || isCallActive) return

    setLiveCall({ driver: selectedDriverObj, load: selectedLoadObj, state: CALL_STATES.DIALING, message: '' })

    await initiateVoiceCheckCall(selectedDriverObj, selectedLoadObj, (state, message) => {
      setLiveCall(prev => ({ ...prev, state, message }))

      if (state === CALL_STATES.CONFIRMED || state === CALL_STATES.DECLINED) {
        const newEntry = {
          id: `CALL-${Date.now()}`,
          driverName: selectedDriverObj.name,
          route: `${selectedLoadObj.origin.city} → ${selectedLoadObj.destination.city}`,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          outcome: state === CALL_STATES.CONFIRMED ? 'confirmed' : 'declined',
          transcript: state === CALL_STATES.CONFIRMED
            ? '"Yes, I\'m ready. I have the hours."'
            : '"Sorry, cannot take this load right now."',
          duration: '0:40'
        }
        setCallHistory(prev => [newEntry, ...prev])
      }
    })
  }

  const script = selectedDriverObj && selectedLoadObj
    ? getCallScript(selectedDriverObj, selectedLoadObj)
    : null

  return (
    <div className="p-6 space-y-5 min-h-full">
      <PageHeader
        title="Voice Logs"
        subtitle="SENTINEL autonomous driver check-calls via ElevenLabs AI voice"
      />

      <div className="grid grid-cols-5 gap-5">
        {/* ── Initiate call panel ── */}
        <div className="col-span-2 space-y-4">
          <div className="bg-navy-700 border border-navy-500 rounded-lg p-4">
            <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-4">
              Initiate AI Check-Call
            </div>

            {/* Driver selector */}
            <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                Select Driver
              </label>
              <select
                value={selectedDriver}
                onChange={e => setSelectedDriver(e.target.value)}
                className="w-full bg-navy-800 border border-navy-500 rounded px-3 py-2 text-xs text-white
                           focus:outline-none focus:border-sentinel-cyan/50"
              >
                <option value="">-- Choose driver --</option>
                {availableDrivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.hosRemaining}h HOS · {d.location}
                  </option>
                ))}
              </select>
            </div>

            {/* Load selector */}
            <div className="mb-4">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                Select Load
              </label>
              <select
                value={selectedLoad}
                onChange={e => setSelectedLoad(e.target.value)}
                className="w-full bg-navy-800 border border-navy-500 rounded px-3 py-2 text-xs text-white
                           focus:outline-none focus:border-sentinel-cyan/50"
              >
                <option value="">-- Choose load --</option>
                {pendingLoads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.origin.city} → {l.destination.city} · ${(l.rateCents / 100).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Script preview toggle */}
            {script && (
              <div className="mb-4">
                <button
                  onClick={() => setShowScript(s => !s)}
                  className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-300 mb-2"
                >
                  <Volume2 size={11} />
                  {showScript ? 'Hide script' : 'Preview Sentinel script'}
                </button>
                {showScript && (
                  <div className="bg-navy-800 border border-navy-600 rounded p-3 text-[10px] text-gray-400 leading-relaxed fade-in">
                    <div className="text-[9px] text-sentinel-cyan uppercase tracking-wider mb-2 font-bold">
                      SENTINEL will say:
                    </div>
                    {script}
                  </div>
                )}
              </div>
            )}

            {/* Initiate button */}
            <button
              onClick={handleInitiateCall}
              disabled={!selectedDriverObj || !selectedLoadObj || isCallActive}
              className={`
                w-full flex items-center justify-center gap-2 py-2.5 rounded text-xs font-bold
                tracking-wider uppercase transition-all duration-150 border
                ${(!selectedDriverObj || !selectedLoadObj || isCallActive)
                  ? 'bg-navy-600 text-gray-600 border-navy-500 cursor-not-allowed'
                  : 'bg-sentinel-cyan/10 text-sentinel-cyan border-sentinel-cyan/40 hover:bg-sentinel-cyan/20'
                }
              `}
            >
              {isCallActive ? <Spinner size={13} /> : <PhoneCall size={13} />}
              {isCallActive ? 'Call in progress...' : 'Initiate Voice Check-Call'}
            </button>
          </div>

          {/* Live call status */}
          {liveCall && (
            <div className={`
              bg-navy-700 border rounded-lg p-4 fade-in
              ${liveCall.state === CALL_STATES.CONFIRMED ? 'border-sentinel-green/40' :
                liveCall.state === CALL_STATES.DECLINED  ? 'border-sentinel-red/40' :
                'border-sentinel-cyan/30'}
            `}>
              <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-3">
                Live Call Status
              </div>

              {/* State display */}
              <div className="flex items-center gap-2 mb-3">
                {isCallActive && (
                  <span className="w-2 h-2 rounded-full bg-sentinel-cyan sentinel-pulse" />
                )}
                {liveCall.state === CALL_STATES.CONFIRMED && (
                  <CheckCircle size={14} className="text-sentinel-green" />
                )}
                {liveCall.state === CALL_STATES.DECLINED && (
                  <XCircle size={14} className="text-sentinel-red" />
                )}
                <span className={`text-xs font-bold ${
                  liveCall.state === CALL_STATES.CONFIRMED ? 'text-sentinel-green' :
                  liveCall.state === CALL_STATES.DECLINED  ? 'text-sentinel-red' :
                  'text-sentinel-cyan'
                }`}>
                  {liveCall.state === CALL_STATES.DIALING   && 'Dialing...'}
                  {liveCall.state === CALL_STATES.CONNECTED  && 'Line connected'}
                  {liveCall.state === CALL_STATES.SPEAKING   && 'SENTINEL speaking'}
                  {liveCall.state === CALL_STATES.CONFIRMED  && 'Driver confirmed'}
                  {liveCall.state === CALL_STATES.DECLINED   && 'Driver unavailable'}
                </span>
              </div>

              <div className="text-xs font-bold text-white mb-1">{liveCall.driver.name}</div>
              <div className="text-[10px] text-gray-500 mb-2">
                {liveCall.load.origin.city} → {liveCall.load.destination.city}
              </div>

              {liveCall.message && (
                <div className={`text-[10px] italic leading-relaxed ${
                  liveCall.state === CALL_STATES.CONFIRMED ? 'text-sentinel-green' :
                  liveCall.state === CALL_STATES.DECLINED  ? 'text-sentinel-red' :
                  'text-gray-400'
                }`}>
                  "{liveCall.message.includes('—') ? liveCall.message.split('—')[1]?.trim() : liveCall.message}"
                </div>
              )}

              {(liveCall.state === CALL_STATES.CONFIRMED || liveCall.state === CALL_STATES.DECLINED) && (
                <button
                  onClick={() => { setLiveCall(null); setSelectedDriver(''); setSelectedLoad('') }}
                  className="mt-3 text-[10px] text-gray-600 hover:text-gray-400 underline"
                >
                  New call
                </button>
              )}
            </div>
          )}

          {/* API key notice */}
          <div className="bg-navy-800 border border-navy-600 rounded p-3">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 font-bold">API mode</div>
            <div className="text-[10px] text-gray-500">
              {import.meta.env.VITE_ELEVENLABS_API_KEY && import.meta.env.VITE_ELEVENLABS_API_KEY !== 'your_elevenlabs_key_here'
                ? '✓ ElevenLabs key detected — real audio will play'
                : '◇ Demo mode — call flow simulated. Add VITE_ELEVENLABS_API_KEY to .env for real audio.'
              }
            </div>
          </div>
        </div>

        {/* ── Call history ── */}
        <div className="col-span-3">
          <div className="text-[10px] font-bold tracking-widest uppercase text-gray-500 mb-3 flex items-center gap-2">
            <Clock size={12} />
            Call Log — Today
          </div>
          <div className="space-y-2">
            {callHistory.map(call => (
              <div
                key={call.id}
                className={`
                  bg-navy-700 border rounded-lg px-4 py-3 fade-in
                  ${call.outcome === 'confirmed' ? 'border-navy-500' : 'border-sentinel-red/20'}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                      ${call.outcome === 'confirmed'
                        ? 'bg-sentinel-green/10 border border-sentinel-green/25'
                        : 'bg-sentinel-red/10 border border-sentinel-red/25'
                      }
                    `}>
                      {call.outcome === 'confirmed'
                        ? <CheckCircle size={14} className="text-sentinel-green" />
                        : <XCircle size={14} className="text-sentinel-red" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white">{call.driverName}</span>
                        <span className={`
                          text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider
                          ${call.outcome === 'confirmed'
                            ? 'bg-sentinel-green/10 text-sentinel-green border border-sentinel-green/25'
                            : 'bg-sentinel-red/10 text-sentinel-red border border-sentinel-red/25'
                          }
                        `}>
                          {call.outcome}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500">{call.route}</div>
                      <div className="text-[10px] text-gray-400 mt-1.5 italic">{call.transcript}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] text-gray-500">{call.time}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{call.duration}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
