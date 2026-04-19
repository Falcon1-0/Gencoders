async function parseJson(response) {
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }
  return response.json()
}

export async function fetchLiveBoardState(signal) {
  const response = await fetch('/api/live-board/state', { signal })
  return parseJson(response)
}

export async function fetchHealth(signal) {
  const response = await fetch('/api/health', { signal })
  return parseJson(response)
}

export async function requestDispatchDecision(payload, signal) {
  const response = await fetch('/api/dispatch/decision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  return parseJson(response)
}

export function subscribeToLiveBoard({ onSnapshot, onError }) {
  const eventSource = new EventSource('/api/live-board/events')

  eventSource.addEventListener('snapshot', (event) => {
    try {
      onSnapshot(JSON.parse(event.data))
    } catch (error) {
      onError?.(error)
    }
  })

  eventSource.onerror = (error) => {
    onError?.(error)
  }

  return () => eventSource.close()
}
