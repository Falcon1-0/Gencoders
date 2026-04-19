import React, { useState, useCallback } from 'react'
import { Zap, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { getTopDriversForLoad, formatRate, formatHos } from '../utils/matchEngine.js'
import { getAiDispatchRecommendation } from '../api/claudeApi.js'
import { HosBar, PriorityBadge, Spinner, AiSourceBadge } from './UI.jsx'
import VoiceCallButton from './VoiceCallButton.jsx'

export default function SmartMatchPanel({ load, drivers, onAssign }) {
  const [result, setResult] = useState(null)         // { top, deadheadAlerts }
  const [aiRec, setAiRec] = useState(null)           // Claude recommendation
  const [loading, setLoading] = useState(false)
  const [assignedDriverId, setAssignedDriverId] = useState(null)

  const runSmartMatch = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setAiRec(null)

    // Step 1: Run local match algorithm
    const matchResult = getTopDriversForLoad(drivers, load, 3)
    setResult(matchResult)

    // Step 2: Ask Claude for natural-language recommendation
    if (matchResult.top.length > 0) {
      const rec = await getAiDispatchRecommendation(load, matchResult.top)
      setAiRec(rec)
    }

    setLoading(false)
  }, [load, drivers])

  const handleAssign = (driver) => {
    setAssignedDriverId(driver.id)
    onAssign?.(load, driver)
  }

  const getAiReasonForDriver = (driverName) => {
    if (!aiRec?.data?.drivers) return null
    return aiRec.data.drivers.find(d => d.name === driverName)
  }

  return (
    <div className="bg-navy-700 border border-navy-500 rounded-lg overflow-hidden fade-in">
      {/* Load header */}
      <div className="px-4 py-3 border-b border-navy-500 bg-navy-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <PriorityBadge priority={load.priority} />
              <span className="text-[9px] text-gray-600 font-mono">{load.id}</span>
            </div>
            <div className="text-sm font-bold text-white truncate">
              {load.origin.city}, {load.origin.state} → {load.destination.city}, {load.destination.state}
            </div>
            <div className="flex gap-4 mt-1 text-[10px] text-gray-500">
              <span>{load.distanceMiles.toLocaleString()} mi</span>
              <span>{(load.weightLbs / 1000).toFixed(0)}k lbs</span>
              <span>{load.commodity}</span>
              <span className="text-sentinel-green font-bold">{formatRate(load.rateCents)}</span>
            </div>
          </div>
          <button
            onClick={runSmartMatch}
            disabled={loading || assignedDriverId}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded text-[10px] font-bold
              tracking-wider uppercase transition-all duration-150 flex-shrink-0
              ${loading || assignedDriverId
                ? 'bg-navy-600 text-gray-600 cursor-not-allowed border border-navy-500'
                : 'bg-sentinel-cyan/10 text-sentinel-cyan border border-sentinel-cyan/40 hover:bg-sentinel-cyan/20'
              }
            `}
          >
            {loading ? <Spinner size={12} /> : <Zap size={12} />}
            {loading ? 'Analyzing...' : 'Smart Match'}
          </button>
        </div>
      </div>

      {/* AI headline recommendation */}
      {aiRec?.data?.recommendation && !assignedDriverId && (
        <div className="px-4 py-2.5 bg-sentinel-cyan/5 border-b border-sentinel-cyan/10">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-bold tracking-widest uppercase text-sentinel-cyan">
              Sentinel Recommendation
            </span>
            <AiSourceBadge source={aiRec.source} />
          </div>
          <p className="text-[11px] text-white">{aiRec.data.recommendation.headline}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-[9px] text-gray-500">
              Confidence: <span className="text-sentinel-cyan">{aiRec.data.recommendation.confidence}</span>
            </span>
            <span className="text-[9px] text-gray-500">
              Est. profit: <span className="text-sentinel-green">{aiRec.data.recommendation.estimatedProfit}</span>
            </span>
          </div>
        </div>
      )}

      {/* Deadhead alerts */}
      {result?.deadheadAlerts?.length > 0 && (
        <div className="px-4 py-2 bg-sentinel-amber/5 border-b border-sentinel-amber/10 flex items-center gap-2">
          <AlertTriangle size={11} className="text-sentinel-amber flex-shrink-0" />
          <span className="text-[10px] text-sentinel-amber">
            High deadhead: {result.deadheadAlerts.map(a => `${a.driverName} (${a.deadheadMiles}mi)`).join(', ')}
          </span>
        </div>
      )}

      {/* Assigned success state */}
      {assignedDriverId && (
        <div className="px-4 py-4 flex items-center gap-2">
          <CheckCircle size={14} className="text-sentinel-green" />
          <span className="text-[11px] text-sentinel-green font-bold">
            Load assigned — TMS updated
          </span>
        </div>
      )}

      {/* Top driver cards */}
      {result?.top?.length > 0 && !assignedDriverId && (
        <div className="divide-y divide-navy-500">
          {result.top.map((match) => {
            const aiDriver = getAiReasonForDriver(match.driver.name)
            const isTopPick = match.rank === 1
            return (
              <div
                key={match.driver.id}
                className={`px-4 py-3 ${isTopPick ? 'bg-sentinel-green/3' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Rank badge */}
                  <div className={`
                    w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold
                    flex-shrink-0 mt-0.5
                    ${isTopPick
                      ? 'bg-sentinel-green/15 text-sentinel-green border border-sentinel-green/30'
                      : 'bg-navy-600 text-gray-500 border border-navy-400'
                    }
                  `}>
                    {match.rank}
                  </div>

                  {/* Driver info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${isTopPick ? 'text-white' : 'text-gray-300'}`}>
                        {match.driver.name}
                      </span>
                      {isTopPick && (
                        <span className="text-[8px] bg-sentinel-green/15 text-sentinel-green border border-sentinel-green/25 px-1.5 py-0.5 rounded-sm font-bold tracking-wider uppercase">
                          Top Pick
                        </span>
                      )}
                    </div>

                    {/* Score pills */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <ScorePill label={`${formatHos(match.driver.hosRemaining)} HOS`} good={match.driver.hosRemaining > 6} />
                      <ScorePill label={`${match.deadheadMiles}mi deadhead`} good={!match.deadheadWarning} warn={match.deadheadWarning} />
                      <ScorePill label={`$${match.driver.cpm}/mi CPM`} good={match.driver.cpm < 1.90} />
                      <ScorePill label={`${match.reliabilityScore}% reliable`} good={match.reliabilityScore > 90} />
                    </div>

                    {/* HOS bar */}
                    <div className="w-40 mb-2">
                      <HosBar hours={match.driver.hosRemaining} />
                    </div>

                    {/* AI reason */}
                    {aiDriver && (
                      <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                        {aiDriver.reason}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAssign(match.driver)}
                        className={`
                          flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold
                          tracking-wider uppercase transition-all duration-150
                          ${isTopPick
                            ? 'bg-sentinel-green/15 text-sentinel-green border border-sentinel-green/40 hover:bg-sentinel-green/25'
                            : 'bg-navy-600 text-gray-400 border border-navy-400 hover:border-gray-400 hover:text-gray-200'
                          }
                        `}
                      >
                        <ChevronRight size={10} />
                        Assign Load
                      </button>
                      <VoiceCallButton driver={match.driver} load={load} />
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className={`text-base font-bold ${isTopPick ? 'text-sentinel-green' : 'text-gray-500'}`}>
                      {match.score.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-gray-600">score</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dispatch note */}
      {aiRec?.data?.dispatchNote && !assignedDriverId && (
        <div className="px-4 py-2.5 border-t border-navy-500 bg-navy-800/50">
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">Dispatch note: </span>
          <span className="text-[10px] text-gray-400">{aiRec.data.dispatchNote}</span>
        </div>
      )}
    </div>
  )
}

function ScorePill({ label, good, warn }) {
  return (
    <span className={`
      px-1.5 py-0.5 text-[9px] rounded-sm border font-mono
      ${good  ? 'bg-sentinel-green/8 text-sentinel-green border-sentinel-green/20' : ''}
      ${warn  ? 'bg-sentinel-amber/8 text-sentinel-amber border-sentinel-amber/20' : ''}
      ${!good && !warn ? 'bg-navy-600 text-gray-500 border-navy-400' : ''}
    `}>
      {label}
    </span>
  )
}
