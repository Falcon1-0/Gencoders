// ─────────────────────────────────────────────────────────────────────────────
// elevenLabsApi.js — ElevenLabs TTS for SENTINEL Voice Check-Call feature
//
// When a real API key is present, this calls ElevenLabs TTS and plays audio.
// When no key is present, it simulates the call flow with timed state changes.
// ─────────────────────────────────────────────────────────────────────────────

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

function getApiKey() {
  return import.meta.env.VITE_ELEVENLABS_API_KEY || ''
}

function getVoiceId() {
  return import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
}

function hasApiKey() {
  const key = getApiKey()
  return key && key !== 'your_elevenlabs_key_here'
}

// Build the script SENTINEL will speak to the driver
function buildCallScript(driverName, load) {
  const rate = `$${(load.rateCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const dest = `${load.destination.city}, ${load.destination.state}`
  const hos = Math.floor(load.distanceMiles / 55) + 2 // rough estimate

  return `Hey ${driverName.split(' ')[0]}, Sentinel here — your AI dispatch assistant from TruckerPath COMMAND. ` +
    `I'm calling to confirm a new load opportunity. ` +
    `It's a ${rate} load heading to ${dest}, ${load.distanceMiles} miles. ` +
    `Commodity is ${load.commodity}. ` +
    `You'll need approximately ${hos} hours of HOS to complete this run. ` +
    `Can you confirm you're available and have the hours?`
}

// Call states that the UI cycles through
export const CALL_STATES = {
  IDLE:       'idle',
  DIALING:    'dialing',
  CONNECTED:  'connected',
  SPEAKING:   'speaking',
  CONFIRMED:  'confirmed',
  DECLINED:   'declined',
  ERROR:      'error'
}

// Main function: initiates a voice check-call
// onStateChange(state, message) is called at each step so UI can update
export async function initiateVoiceCheckCall(driver, load, onStateChange) {
  onStateChange(CALL_STATES.DIALING, `Dialing ${driver.name}...`)

  await delay(1800)
  onStateChange(CALL_STATES.CONNECTED, `Connected to ${driver.name}`)

  await delay(800)
  onStateChange(CALL_STATES.SPEAKING, 'SENTINEL speaking...')

  if (hasApiKey()) {
    await callWithElevenLabs(driver, load, onStateChange)
  } else {
    await simulateCall(driver, load, onStateChange)
  }
}

// Real ElevenLabs TTS call + browser audio playback
async function callWithElevenLabs(driver, load, onStateChange) {
  try {
    const script = buildCallScript(driver.name, load)

    const response = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${getVoiceId()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': getApiKey()
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3 }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`ElevenLabs error ${response.status}`)
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    await new Promise((resolve, reject) => {
      audio.onended = resolve
      audio.onerror = reject
      audio.play()
    })

    URL.revokeObjectURL(audioUrl)

    await delay(600)
    onStateChange(
      CALL_STATES.CONFIRMED,
      `${driver.name} confirmed — "Yes, I'm ready. I have the hours."`
    )
  } catch (err) {
    console.warn('ElevenLabs TTS failed, falling back to simulation:', err)
    await simulateCall(driver, load, onStateChange)
  }
}

// Simulated call flow when no ElevenLabs key is available
async function simulateCall(driver, load, onStateChange) {
  const script = buildCallScript(driver.name, load)

  // Simulate speech duration (roughly 150 words per minute)
  const wordCount = script.split(' ').length
  const speakMs = Math.min((wordCount / 150) * 60000, 8000)

  await delay(speakMs)

  // 90% of the time the driver confirms (for demo purposes)
  const confirmed = Math.random() > 0.1

  if (confirmed) {
    onStateChange(
      CALL_STATES.CONFIRMED,
      `${driver.name} confirmed — "Yes, I'm ready. I have the hours."`
    )
  } else {
    onStateChange(
      CALL_STATES.DECLINED,
      `${driver.name} unavailable — moving to next recommendation.`
    )
  }
}

// Helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate the script text for display in the UI (no audio)
export function getCallScript(driver, load) {
  return buildCallScript(driver.name, load)
}
