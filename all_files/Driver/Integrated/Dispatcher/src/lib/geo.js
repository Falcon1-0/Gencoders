const cityData = {
  'Phoenix, AZ': { lat: 33.4484, lon: -112.074, diesel: 3.95, weatherBias: 'moderate' },
  'Dallas, TX': { lat: 32.7767, lon: -96.797, diesel: 3.82, weatherBias: 'moderate' },
  'Tucson, AZ': { lat: 32.2226, lon: -110.9747, diesel: 3.91, weatherBias: 'low' },
  'El Paso, TX': { lat: 31.7619, lon: -106.485, diesel: 3.87, weatherBias: 'moderate' },
  'Albuquerque, NM': { lat: 35.0844, lon: -106.6504, diesel: 3.84, weatherBias: 'moderate' },
  'Amarillo, TX': { lat: 35.222, lon: -101.8313, diesel: 3.78, weatherBias: 'low' },
  'Flagstaff, AZ': { lat: 35.1983, lon: -111.6513, diesel: 3.98, weatherBias: 'moderate' },
  'Oklahoma City, OK': { lat: 35.4676, lon: -97.5164, diesel: 3.76, weatherBias: 'low' },
  'Little Rock, AR': { lat: 34.7465, lon: -92.2896, diesel: 3.8, weatherBias: 'low' },
  'Houston, TX': { lat: 29.7604, lon: -95.3698, diesel: 3.84, weatherBias: 'moderate' },
  'Los Angeles, CA': { lat: 34.0522, lon: -118.2437, diesel: 4.56, weatherBias: 'moderate' },
  'Memphis, TN': { lat: 35.1495, lon: -90.049, diesel: 3.87, weatherBias: 'moderate' },
  'Kansas City, MO': { lat: 39.0997, lon: -94.5786, diesel: 3.79, weatherBias: 'low' },
  'San Antonio, TX': { lat: 29.4241, lon: -98.4936, diesel: 3.83, weatherBias: 'moderate' },
  'Mesa, AZ': { lat: 33.4152, lon: -111.8315, diesel: 3.94, weatherBias: 'moderate' },
  'Lubbock, TX': { lat: 33.5779, lon: -101.8552, diesel: 3.79, weatherBias: 'low' },
}

export const supportedCities = Object.keys(cityData).sort()

export function normalizeCityName(rawValue = '') {
  return rawValue.replace(/\s+/g, ' ').trim()
}

export function getCityData(cityName) {
  const normalized = normalizeCityName(cityName)
  if (cityData[normalized]) {
    return { name: normalized, ...cityData[normalized] }
  }

  const match = supportedCities.find((city) => city.toLowerCase() === normalized.toLowerCase())
  if (match) {
    return { name: match, ...cityData[match] }
  }

  return null
}

export function formatRouteKey(origin, destination) {
  return `${normalizeCityName(origin)}->${normalizeCityName(destination)}`
}

function haversineMiles(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusMiles = 3958.8
  const dLat = toRadians(b.lat - a.lat)
  const dLon = toRadians(b.lon - a.lon)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  return earthRadiusMiles * centralAngle
}

export function estimateRoadMiles(origin, destination) {
  const originData = getCityData(origin)
  const destinationData = getCityData(destination)

  if (!originData || !destinationData) {
    return null
  }

  const crowFliesMiles = haversineMiles(originData, destinationData)
  return Math.max(10, Math.round(crowFliesMiles * 1.18))
}

export function estimateLaneDiesel(origin, destination, fallback = 3.95) {
  const originData = getCityData(origin)
  const destinationData = getCityData(destination)
  if (!originData || !destinationData) return fallback
  return Number(((originData.diesel + destinationData.diesel) / 2).toFixed(2))
}

export function defaultWeatherRisk(origin, destination) {
  const originData = getCityData(origin)
  const destinationData = getCityData(destination)
  const riskMap = { low: 1, moderate: 2, high: 3 }
  const originRisk = riskMap[originData?.weatherBias ?? 'moderate']
  const destinationRisk = riskMap[destinationData?.weatherBias ?? 'moderate']
  return Math.round((originRisk + destinationRisk) / 2)
}
