import { getCityData } from './geo.js'

function classifyRisk(snapshot) {
  if (!snapshot) return 1
  const wind = Number(snapshot.windSpeed || 0)
  const precipitation = Number(snapshot.precipitation || 0)
  if (wind >= 28 || precipitation >= 1.8) return 3
  if (wind >= 18 || precipitation >= 0.3) return 2
  return 1
}

async function fetchCityWeather(cityName) {
  const city = getCityData(cityName)
  if (!city) return null

  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error('Weather lookup failed')
  }

  const payload = await response.json()
  return {
    city: city.name,
    temperature: payload.current?.temperature_2m,
    precipitation: payload.current?.precipitation,
    windSpeed: payload.current?.wind_speed_10m,
    weatherCode: payload.current?.weather_code,
  }
}

export async function fetchRouteWeather(origin, destination) {
  try {
    const [originWeather, destinationWeather] = await Promise.all([
      fetchCityWeather(origin),
      fetchCityWeather(destination),
    ])

    const risk = Math.max(classifyRisk(originWeather), classifyRisk(destinationWeather))
    const riskLabel = risk === 3 ? 'High' : risk === 2 ? 'Moderate' : 'Low'
    const reason =
      risk === 3
        ? 'Live weather shows a meaningful wind or precipitation event on this lane.'
        : risk === 2
          ? 'Live weather is manageable, but it adds some ETA risk.'
          : 'Live weather looks clean for this lane right now.'

    return {
      risk,
      riskLabel,
      originWeather,
      destinationWeather,
      reason,
    }
  } catch (error) {
    return null
  }
}
