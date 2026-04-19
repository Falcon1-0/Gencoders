import React, { useState } from 'react'
import { Mic, PhoneCall, PhoneOff, CheckCircle, XCircle } from 'lucide-react'
import { initiateVoiceCheckCall, CALL_STATES, getCallScript } from '../api/elevenLabsApi.js'
import { Spinner } from './UI.jsx'

export default function VoiceCallButton({ driver, load }) {
  const [callState, setCallState] = useState(CALL_STATES.IDLE)
  const [statusMessage, setStatusMessage] = useState('')
  const [showScript, setShowScript] = useState(false)

  const isInProgress = [CALL_STATES.DIALING, CALL_STATES.CONNECTED, CALL_STATES.SPEAKING].includes(callState)
  const isDone = [CALL_STATES.CONFIRMED, CALL_STATES.DECLINED, CALL_STATES.ERROR].includes(callState)

  const handleCall = async () => {
    if (isInProgress || isDone) return
    setShowScript(false)

    await initiateVoiceCheckCall(driver, load, (state, message) => {
      setCallState(state)
      setStatusMessage(message)
    })
  }

  const handleReset = () => {
    setCallState(CALL_STATES.IDLE)
    setStatusMessage('')
    setShowScript(false)
  }

  const script = getCallScript(driver, load)

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {/* Main call button */}
        {!isDone ? (
          <button
            onClick={handleCall}
            disabled={isInProgress}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold
              tracking-wider uppercase transition-all duration-150 border
              ${isInProgress
                ? 'bg-sentinel-cyan/10 text-sentinel-cyan border-sentinel-cyan/30 cursor-wait'
                : 'bg-navy-600 text-gray-400 border-navy-400 hover:text-sentinel-cyan hover:border-sentinel-cyan/40'
              }
            `}
          >
            {isInProgress ? <Spinner size={11} /> : <Mic size={11} />}
            {callState === CALL_STATES.IDLE     && 'AI Check-Call'}
            {callState === CALL_STATES.DIALING  && 'Dialing...'}
            {callState === CALL_STATES.CONNECTED && 'Connected'}
            {callState === CALL_STATES.SPEAKING  && 'Speaking...'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {callState === CALL_STATES.CONFIRMED ? (
              <div className="flex items-center gap-1 text-sentinel-green text-[10px] font-bold">
                <CheckCircle size={11} />
                Confirmed
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sentinel-red text-[10px] font-bold">
                <XCircle size={11} />
                Unavailable
              </div>
            )}
            <button
              onClick={handleReset}
              className="text-[9px] text-gray-600 hover:text-gray-400 underline"
            >
              reset
            </button>
          </div>
        )}

        {/* Show script toggle */}
        <button
          onClick={() => setShowScript(s => !s)}
          className="text-[9px] text-gray-600 hover:text-gray-400 underline"
        >
          {showScript ? 'hide' : 'script'}
        </button>
      </div>

      {/* Status message */}
      {statusMessage && !isDone && (
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sentinel-cyan sentinel-pulse flex-shrink-0" />
          <span className="text-[10px] text-sentinel-cyan">{statusMessage}</span>
        </div>
      )}

      {/* Confirmed/declined message */}
      {isDone && statusMessage && (
        <div className={`text-[10px] ${callState === CALL_STATES.CONFIRMED ? 'text-sentinel-green' : 'text-sentinel-red'}`}>
          "{statusMessage.split('—')[1]?.trim() || statusMessage}"
        </div>
      )}

      {/* Script preview */}
      {showScript && (
        <div className="mt-1 p-2 bg-navy-800 border border-navy-500 rounded text-[10px] text-gray-400 leading-relaxed max-w-xs fade-in">
          <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">Sentinel script:</div>
          {script}
        </div>
      )}
    </div>
  )
}
