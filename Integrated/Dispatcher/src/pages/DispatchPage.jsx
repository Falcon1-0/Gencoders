import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  CloudSun,
  LoaderCircle,
  Radar,
  RefreshCcw,
  Server,
  ShieldAlert,
  TimerReset,
  Volume2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import BoardActivityFeed from '../components/BoardActivityFeed.jsx'
import DecisionHistoryPanel from '../components/DecisionHistoryPanel.jsx'
import DriverTable from '../components/DriverTable.jsx'
import LoadQueuePanel from '../components/LoadQueuePanel.jsx'
import MetricCard from '../components/MetricCard.jsx'
import RecommendationPanel from '../components/RecommendationPanel.jsx'
import { formatDateTime } from '../lib/formatters.js'
import { fetchHealth, fetchLiveBoardState, requestDispatchDecision, subscribeToLiveBoard } from '../lib/liveBoardApi.js'
import { speakText } from '../lib/voice.js'

const LOAD_HOLD_MS = 12000
const SAME_LOAD_REFRESH_MS = 24000

function buildRankMap(rankedDriverIds = []) {
  return rankedDriverIds.reduce((map, driverId, index) => {
    map[driverId] = index
    return map
  }, {})
}

function decorateDecision(decision, previousRankMap) {
  const nextRankMap = buildRankMap(decision.rankedDriverIds)
  const options = (decision.options || []).map((candidate, index) => {
    const previousRank = previousRankMap[candidate.id]
    const rankDelta = typeof previousRank === 'number' ? previousRank - index : 0
    return {
      ...candidate,
      rankDelta,
    }
  })

  return {
    ...decision,
    options,
    recommended: options.find((candidate) => candidate.id === decision.recommendedDriverId) || decision.recommended,
  }
}

function statusTone(connectionState, fallbackUsed) {
  if (fallbackUsed) return 'amber'
  if (connectionState === 'offline') return 'red'
  return 'green'
}

function getFallbackGuidance(decision, health) {
  return (
    decision?.metadata?.fallbackReason ||
    health?.ollama?.message ||
    'The board is still live, but LLM decisioning could not complete.'
  )
}

function buildDecisionEntry(snapshot, decision) {
  return {
    id: `${snapshot.activeLoad.id}-${decision.updatedAt}`,
    loadId: snapshot.activeLoad.id,
    route: `${snapshot.activeLoad.origin} to ${snapshot.activeLoad.destination}`,
    driverName: decision.recommended?.name || 'No recommendation',
    provider: decision.provider || 'heuristic',
    updatedAt: decision.updatedAt,
    summary: decision.summary || 'Recommendation completed.',
  }
}

export default function DispatchPage({ voiceSettings }) {
  const [boardState, setBoardState] = useState(null)
  const [displaySnapshot, setDisplaySnapshot] = useState(null)
  const [health, setHealth] = useState(null)
  const [decision, setDecision] = useState(null)
  const [decisionHistory, setDecisionHistory] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState(null)
  const [boardLoading, setBoardLoading] = useState(true)
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [connectionState, setConnectionState] = useState('connecting')
  const [boardError, setBoardError] = useState('')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('')
  const previousRankMapRef = useRef({})
  const latestSnapshotRef = useRef(null)
  const displaySnapshotRef = useRef(null)
  const decisionTimerRef = useRef(null)
  const currentRequestRef = useRef(null)
  const decisionInFlightRef = useRef(false)
  const lastDecisionAtRef = useRef(0)
  const mountedRef = useRef(true)

  const selectedDriver = useMemo(
    () => decision?.options?.find((candidate) => candidate.id === selectedDriverId) || decision?.recommended,
    [decision, selectedDriverId],
  )
  const fallbackGuidance = useMemo(() => getFallbackGuidance(decision, health), [decision, health])
  const presentedSnapshot = displaySnapshot || boardState
  const pendingBoardUpdate = useMemo(() => {
    if (!boardState || !displaySnapshot) return false
    return boardState.snapshotVersion !== displaySnapshot.snapshotVersion
  }, [boardState, displaySnapshot])

  const metrics = useMemo(() => {
    if (!decision?.recommended) return []
    return [
      {
        label: 'Best fit score',
        value: decision.recommended.score,
        hint: `${decision.recommended.name} is the best live service + margin balance for this load`,
        tone: 'cyan',
      },
      {
        label: 'Savings vs nearest truck',
        value: `$${decision.savingsVsNaive.toLocaleString()}`,
        hint: 'Shows why the nearest truck is still a weak dispatch rule',
        tone: 'green',
      },
      {
        label: 'Projected on-time confidence',
        value: `${decision.recommended.onTimeConfidence}%`,
        hint: 'Refreshed in controlled intervals so dispatchers can actually read it',
        tone: decision.recommended.onTimeConfidence >= 85 ? 'green' : 'amber',
      },
      {
        label: 'Lane weather risk',
        value: decision.weatherSummary?.riskLabel || decision.weatherLabel,
        hint: decision.weatherSummary?.reason || 'Falling back to corridor weather risk',
        tone: (decision.weatherSummary?.risk || decision.weatherRisk) >= 3 ? 'red' : 'amber',
      },
    ]
  }, [decision])

  function recordDecision(snapshot, nextDecision) {
    setDecisionHistory((current) => {
      const entry = buildDecisionEntry(snapshot, nextDecision)
      if (current[0]?.loadId === entry.loadId) {
        return [entry, ...current.slice(1, 5)]
      }
      return [entry, ...current].slice(0, 5)
    })
  }

  function queueDecisionRefresh() {
    if (!mountedRef.current) return
    if (!latestSnapshotRef.current || decisionInFlightRef.current) return

    if (decisionTimerRef.current) {
      clearTimeout(decisionTimerRef.current)
    }

    const latestSnapshot = latestSnapshotRef.current
    const displayedLoadId = displaySnapshotRef.current?.activeLoad?.id
    const latestLoadId = latestSnapshot.activeLoad?.id
    const sameLoad = displayedLoadId && latestLoadId === displayedLoadId
    const elapsed = Date.now() - lastDecisionAtRef.current
    const holdMs = decision ? (sameLoad ? SAME_LOAD_REFRESH_MS : LOAD_HOLD_MS) : 0
    const waitMs = Math.max(0, holdMs - elapsed)

    decisionTimerRef.current = setTimeout(async () => {
      if (!mountedRef.current || decisionInFlightRef.current || !latestSnapshotRef.current) return

      const snapshot = latestSnapshotRef.current
      const controller = new AbortController()

      currentRequestRef.current = controller
      decisionInFlightRef.current = true
      displaySnapshotRef.current = snapshot
      setDisplaySnapshot(snapshot)
      setDecisionLoading(true)

      try {
        const nextDecision = await requestDispatchDecision({
          activeLoad: snapshot.activeLoad,
          drivers: snapshot.drivers,
          simulationTimestamp: snapshot.clock,
          useLiveWeather: voiceSettings.useLiveWeather,
        }, controller.signal)

        if (!mountedRef.current) return

        const decorated = decorateDecision(nextDecision, previousRankMapRef.current)
        previousRankMapRef.current = buildRankMap(decorated.rankedDriverIds)
        lastDecisionAtRef.current = Date.now()
        setDecision(decorated)
        setSelectedDriverId((current) => {
          if (!current) return decorated.recommended?.id || null
          return decorated.options.some((candidate) => candidate.id === current)
            ? current
            : decorated.recommended?.id || null
        })
        recordDecision(snapshot, decorated)
      } catch (error) {
        if (!mountedRef.current || error.name === 'AbortError') return
        setDecision((current) => current || {
          error: 'Dispatch decision refresh failed. The board is still running, but the ranking service needs attention.',
        })
      } finally {
        decisionInFlightRef.current = false
        currentRequestRef.current = null
        if (mountedRef.current) {
          setDecisionLoading(false)
          queueDecisionRefresh()
        }
      }
    }, waitMs)
  }

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false
    const controller = new AbortController()

    async function bootstrapBoard() {
      setBoardLoading(true)
      try {
        const [snapshot, healthSnapshot] = await Promise.all([
          fetchLiveBoardState(controller.signal),
          fetchHealth(controller.signal),
        ])
        if (cancelled) return
        latestSnapshotRef.current = snapshot
        setBoardState(snapshot)
        setHealth(healthSnapshot)
        setConnectionState('connected')
        setBoardError('')
        queueDecisionRefresh()
      } catch (error) {
        if (cancelled) return
        setConnectionState('offline')
        setBoardError('The live board API is unavailable. Start the local server with `npm run dev` or `npm run start`.')
      } finally {
        if (!cancelled) {
          setBoardLoading(false)
        }
      }
    }

    bootstrapBoard()

    const unsubscribe = subscribeToLiveBoard({
      onSnapshot: (snapshot) => {
        if (cancelled) return
        latestSnapshotRef.current = snapshot
        setBoardState(snapshot)
        setConnectionState('connected')
        setBoardError('')
        setBoardLoading(false)
        queueDecisionRefresh()
      },
      onError: () => {
        if (cancelled) return
        setConnectionState('offline')
      },
    })

    return () => {
      cancelled = true
      mountedRef.current = false
      controller.abort()
      if (decisionTimerRef.current) {
        clearTimeout(decisionTimerRef.current)
      }
      currentRequestRef.current?.abort()
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    queueDecisionRefresh()
  }, [voiceSettings.useLiveWeather])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setInterval(async () => {
      try {
        const nextHealth = await fetchHealth(controller.signal)
        setHealth(nextHealth)
      } catch {
        setHealth(null)
      }
    }, 30000)

    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [])

  async function handleVoice() {
    if (!decision?.dispatchBrief) return
    setVoiceBusy(true)
    try {
      const result = await speakText(decision.dispatchBrief, voiceSettings)
      setVoiceStatus(`Playing via ${result.provider}`)
    } catch (error) {
      setVoiceStatus(error.message)
    } finally {
      setVoiceBusy(false)
    }
  }

  function handleOpenBackend() {
    const backendAppUrl = import.meta.env.VITE_BACKEND_APP_URL || 'http://127.0.0.1:8000'
    window.open(backendAppUrl, '_blank', 'noopener,noreferrer')
  }

  if (boardLoading && !boardState) {
    return (
      <div className="panel p-6">
        <div className="inline-flex items-center gap-2 text-command-ink/80">
          <LoaderCircle size={18} className="animate-spin text-command-cyan" />
          Connecting to the live dispatch board...
        </div>
      </div>
    )
  }

  if (!boardState) {
    return (
      <div className="panel p-6">
        <div className="eyebrow">Live Dispatch Board</div>
        <div className="mt-3 text-lg font-semibold text-white">The board is offline right now</div>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-command-ink/75">{boardError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {decision?.fallbackUsed && decision?.metadata?.llmEnabled !== false && (
        <div className="rounded-3xl border border-command-amber/30 bg-command-amber/10 p-4 text-sm text-command-ink/80">
          <div className="flex items-center gap-2 font-semibold text-white">
            <ShieldAlert size={16} className="text-command-amber" />
            Ollama is unavailable, so FleetMind is running on the deterministic fallback engine.
          </div>
          <div className="mt-2">{fallbackGuidance}</div>
          <div className="mt-3 text-xs leading-6 text-command-ink/70">
            To enable local LLM dispatching: install Ollama, run <code>ollama serve</code>, then run <code>ollama pull qwen3:8b</code>.
          </div>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr]">
        <LoadQueuePanel
          activeLoad={presentedSnapshot?.activeLoad}
          queuedLoads={presentedSnapshot?.queuedLoads}
          clock={presentedSnapshot?.clock}
        />

        <RecommendationPanel
          analysis={decision}
          selectedDriver={selectedDriver}
          onPlayVoice={handleVoice}
          voiceBusy={voiceBusy}
          onOpenBackend={handleOpenBackend}
          weatherSummary={decision?.weatherSummary}
          loading={decisionLoading}
        />
      </section>

      {voiceStatus && (
        <div className="chip w-fit">
          <Volume2 size={14} />
          {voiceStatus}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <DriverTable
          candidates={decision?.options || []}
          selectedDriverId={selectedDriverId}
          onSelect={setSelectedDriverId}
          recommendedId={decision?.recommended?.id}
        />

        <div className="space-y-5">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Radar size={18} className="text-command-cyan" />
              <div>
                <div className="eyebrow">Dispatch engine</div>
                <div className="text-lg font-semibold text-white">Provider, pacing, and board health</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="panel-muted p-4">
                <div className="data-label">Board connection</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  {connectionState === 'connected' ? <Wifi size={14} className="text-command-green" /> : <WifiOff size={14} className="text-command-red" />}
                  {connectionState === 'connected' ? 'Event stream connected' : 'Event stream degraded'}
                </div>
              </div>
              <div className="panel-muted p-4">
                <div className="data-label">Decision provider</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <Server size={14} className="text-command-cyan" />
                  {decision?.provider || 'pending'} · {decision?.model || 'waiting'}
                </div>
              </div>
              <div className="panel-muted p-4">
                <div className="data-label">Last decision</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {decision?.updatedAt ? formatDateTime(decision.updatedAt) : 'Waiting...'}
                </div>
              </div>
              <div className="panel-muted p-4">
                <div className="data-label">Display cadence</div>
                <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <TimerReset size={14} className="text-command-cyan" />
                  {LOAD_HOLD_MS / 1000}s hold between tasks
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-command-ink/75">
              <div className={`chip ${statusTone(connectionState, decision?.fallbackUsed) === 'amber' ? '!text-command-amber' : statusTone(connectionState, decision?.fallbackUsed) === 'red' ? '!text-command-red' : '!text-command-green'}`}>
                <RefreshCcw size={14} />
                Sequential recommendations only
              </div>
              {pendingBoardUpdate && (
                <div className="chip !text-command-amber">
                  <Activity size={14} />
                  New board updates waiting for the next readable slot
                </div>
              )}
              {health && (
                <div className="chip">
                  <Activity size={14} />
                  Ollama health {health.ollama?.enabled === false ? 'disabled' : health.ollama?.reachable ? 'reachable' : 'offline'}
                </div>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <CloudSun size={18} className="text-command-cyan" />
              <div>
                <div className="eyebrow">Lane snapshot</div>
                <div className="text-lg font-semibold text-white">Weather and service risk</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-command-ink/80">
              {decisionLoading && !decision?.weatherSummary ? (
                <span className="inline-flex items-center gap-2 text-command-slate">
                  <LoaderCircle size={16} className="animate-spin" />
                  Refreshing weather and decision context...
                </span>
              ) : decision?.weatherSummary ? (
                <div className="space-y-2">
                  <p>{decision.weatherSummary.reason}</p>
                  <p>
                    {decision.weatherSummary.originWeather?.city}: {decision.weatherSummary.originWeather?.temperature}° · wind {decision.weatherSummary.originWeather?.windSpeed} mph
                  </p>
                  <p>
                    {decision.weatherSummary.destinationWeather?.city}: {decision.weatherSummary.destinationWeather?.temperature}° · wind {decision.weatherSummary.destinationWeather?.windSpeed} mph
                  </p>
                </div>
              ) : (
                <p>
                  Live weather is off or unavailable. The board is falling back to corridor risk so the ranking engine stays stable.
                </p>
              )}
            </div>
          </div>

          <DecisionHistoryPanel entries={decisionHistory} />
        </div>
      </section>

      <BoardActivityFeed activity={boardState.activity} />
    </div>
  )
}
