let activeAudio = null
let activeUrl = null
let activeUtterance = null

function cleanupAudio() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio = null
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl)
    activeUrl = null
  }
}

export function stopSpeaking() {
  cleanupAudio()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  activeUtterance = null
}

export async function speakText(text, options = {}) {
  stopSpeaking()

  const key = options.elevenLabsKey || import.meta.env.VITE_ELEVENLABS_API_KEY
  const voiceId = options.voiceId || import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'
  const preferElevenLabs = Boolean(options.preferElevenLabs && key)

  if (preferElevenLabs) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': key,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.7,
        },
      }),
    })

    if (!response.ok) {
      throw new Error('ElevenLabs audio generation failed')
    }

    const blob = await response.blob()
    activeUrl = URL.createObjectURL(blob)
    activeAudio = new Audio(activeUrl)
    await activeAudio.play()
    activeAudio.onended = () => cleanupAudio()
    return { provider: 'ElevenLabs' }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    activeUtterance = new SpeechSynthesisUtterance(text)
    activeUtterance.rate = 1.02
    activeUtterance.pitch = 1
    window.speechSynthesis.speak(activeUtterance)
    return { provider: 'Browser speech' }
  }

  throw new Error('No speech engine is available in this browser')
}
