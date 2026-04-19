const NAVPRO_API_KEY = import.meta.env.VITE_TRUCKERPATH_API_KEY || ''
const NAVPRO_CLIENT_ID = import.meta.env.VITE_TRUCKERPATH_CLIENT_ID || ''
const NAVPRO_BASE_URL = import.meta.env.VITE_TRUCKERPATH_BASE_URL || ''

export function getNavProConfig() {
  return {
    apiKey: NAVPRO_API_KEY,
    clientId: NAVPRO_CLIENT_ID,
    baseUrl: NAVPRO_BASE_URL
  }
}

export function getNavProHeaders() {
  const headers = {}

  if (NAVPRO_API_KEY) {
    headers.Authorization = `Bearer ${NAVPRO_API_KEY}`
  }

  if (NAVPRO_CLIENT_ID) {
    headers['x-client-id'] = NAVPRO_CLIENT_ID
  }

  return headers
}

export function getNavProConnection() {
  const connected = Boolean(
    NAVPRO_API_KEY &&
    NAVPRO_API_KEY !== 'your_truckerpath_key_here' &&
    NAVPRO_CLIENT_ID
  )

  return {
    connected,
    source: connected ? 'live-ready' : 'demo',
    label: connected ? 'NavPro API connected' : 'Demo data active',
    detail: connected
      ? 'The app is ready to replace mock routing with your TruckerPath/NavPro responses once the base URL is added.'
      : 'Add VITE_TRUCKERPATH_API_KEY, VITE_TRUCKERPATH_CLIENT_ID, and the base URL in .env to wire real TruckerPath/NavPro requests next.'
  }
}

export const navProCapabilityNotes = [
  {
    title: 'Truck-safe route planning',
    detail: 'Routing is designed around truck-safe defaults, then tuned for fastest, cost-aware, or preferred-road decisions.'
  },
  {
    title: 'Profile-based routing',
    detail: 'Truck dimensions, weight, axles, and HazMat profiles can shape which route is compliant.'
  },
  {
    title: 'Stops along the route',
    detail: 'Parking, fuel stops, weigh stations, and custom POIs can be added directly into the trip plan.'
  },
  {
    title: 'Traffic and live awareness',
    detail: 'Live traffic, alerts, and camera feeds help drivers and dispatchers react to conditions ahead.'
  }
]
