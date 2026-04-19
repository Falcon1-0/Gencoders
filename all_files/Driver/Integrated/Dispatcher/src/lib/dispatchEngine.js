import { demoClock } from '../data/mockData.js'
import { clamp, hoursBetween } from './formatters.js'
import {
  defaultWeatherRisk,
  estimateLaneDiesel,
  estimateRoadMiles,
  formatRouteKey,
} from './geo.js'

const dwellHours = {
  pickup: 1.25,
  delivery: 1,
}

const weatherLabels = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits))
}

function average(list, selector) {
  if (!list.length) return 0
  return list.reduce((sum, item) => sum + Number(selector(item) || 0), 0) / list.length
}

function sortByScoreDescending(candidates) {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.projectedTripCost !== b.projectedTripCost) return a.projectedTripCost - b.projectedTripCost
    return a.emptyMiles - b.emptyMiles
  })
}

function isDriverReserved(driver) {
  const status = String(driver?.status || '').toLowerCase()
  return Boolean(driver?.dispatchLocked || status.includes('assigned') || status.includes('committed'))
}

function getStatusModifier(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('available')) return 6
  if (normalized.includes('loading')) return 1
  if (normalized.includes('driving')) return -1
  if (normalized.includes('reset')) return -8
  if (normalized.includes('risk') || normalized.includes('violation')) return -14
  return 0
}

function getWeatherSurcharge(weatherRisk, loadedMiles) {
  const multiplier = { 1: 0.01, 2: 0.035, 3: 0.07 }
  return loadedMiles * (multiplier[weatherRisk] ?? 0.03)
}

function getFuelPrice(load) {
  return load.dieselUsdPerGallon || estimateLaneDiesel(load.origin, load.destination, 3.95)
}

function buildReasons(candidate, fleetAvgCpm) {
  const reasons = []
  const cpmDelta = candidate.projectedCpm - fleetAvgCpm

  if (candidate.pickupFeasible) {
    reasons.push(`Can still cover pickup with ${round(candidate.pickupBufferHours, 1)} hours of buffer`)
  } else {
    reasons.push(`Would miss the pickup window by ${round(Math.abs(candidate.pickupBufferHours), 1)} hours`)
  }

  if (candidate.emptyMiles <= 80) {
    reasons.push(`Only ${candidate.emptyMiles} empty miles to pickup`)
  } else if (candidate.emptyMiles <= 180) {
    reasons.push(`${candidate.emptyMiles} empty miles is manageable for this rate`)
  } else {
    reasons.push(`${candidate.emptyMiles} empty miles creates noticeable reposition cost`)
  }

  if (candidate.resetsNeeded === 0) {
    reasons.push('No reset required to finish this load')
  } else if (candidate.resetsNeeded === 1) {
    reasons.push('Needs one reset during transit, still inside service window')
  } else {
    reasons.push(`Needs ${candidate.resetsNeeded} resets, which compresses delivery slack`)
  }

  if (candidate.routeFit >= 0.88) {
    reasons.push('Strong corridor history on this lane')
  } else if (candidate.routeFit <= 0.65) {
    reasons.push('Weak historical performance on this corridor')
  }

  if (cpmDelta <= -0.08) {
    reasons.push(`Projected CPM is ${Math.abs(cpmDelta).toFixed(2)} below fleet average`)
  } else if (cpmDelta >= 0.12) {
    reasons.push(`Projected CPM is ${cpmDelta.toFixed(2)} above fleet average`)
  }

  return reasons.slice(0, 4)
}

export function getWeatherLabel(weatherRisk) {
  return weatherLabels[weatherRisk] || weatherLabels[2]
}

export function buildDispatchCandidates(drivers, load, options = {}) {
  const {
    liveWeatherRisk = null,
    currentTime = demoClock,
  } = options

  const laneMiles = estimateRoadMiles(load.origin, load.destination)

  if (!laneMiles) {
    return {
      error: 'Unsupported city. Use one of the built-in demo cities for a guaranteed run.',
      options: [],
      candidates: [],
    }
  }

  const fleetAvgCpm = average(drivers, (driver) => driver.avgCpm)
  const averageSpeed = Number(load.averageSpeedMph || 57)
  const weatherRisk = liveWeatherRisk || defaultWeatherRisk(load.origin, load.destination)
  const hoursUntilPickup = hoursBetween(load.pickupAt, currentTime)
  const hoursUntilDelivery = hoursBetween(load.deliveryBy, currentTime)
  const fuelPrice = getFuelPrice(load)

  const candidates = drivers.flatMap((driver) => {
    if (isDriverReserved(driver)) {
      return []
    }

    const emptyMiles = estimateRoadMiles(driver.currentCity, load.origin)
    const driveHoursToPickup = emptyMiles / averageSpeed
    const loadedDriveHours = laneMiles / averageSpeed
    const totalDriveHours = driveHoursToPickup + loadedDriveHours
    const breakHours = Math.floor(totalDriveHours / 8) * 0.5
    const resetsNeeded = Math.max(0, Math.ceil((totalDriveHours - driver.hosDriveHours) / 11))
    const pickupResetHours = driveHoursToPickup > driver.hosDriveHours ? 10 : 0
    const totalServiceHours = totalDriveHours + dwellHours.pickup + dwellHours.delivery + breakHours + resetsNeeded * 10
    const pickupEtaHours = driveHoursToPickup + pickupResetHours
    const pickupBufferHours = hoursUntilPickup - pickupEtaHours
    const pickupFeasible = pickupBufferHours >= 0
    const deliveryBufferHours = hoursUntilDelivery - totalServiceHours
    const hoursLate = Math.max(0, Math.abs(Math.min(deliveryBufferHours, 0)))
    const routeFit = driver.corridorScores[formatRouteKey(load.origin, load.destination)] ?? 0.7
    const deadheadCost = emptyMiles * driver.avgCpm * 0.62
    const loadedCost = laneMiles * driver.avgCpm
    const fuelCost = ((emptyMiles + laneMiles) / driver.mpg) * fuelPrice
    const weatherSurcharge = getWeatherSurcharge(weatherRisk, laneMiles)
    const resetCost = resetsNeeded * 165
    const latenessCost = hoursLate * 90
    const projectedTripCost = loadedCost + deadheadCost + weatherSurcharge + resetCost + latenessCost
    const projectedCpm = projectedTripCost / laneMiles
    const marginUsd = Number(load.rateUsd || 0) - projectedTripCost
    const onTimeConfidence = clamp(
      94 - hoursLate * 24 - resetsNeeded * 7 - weatherRisk * 4 - emptyMiles / 42 + routeFit * 17 + (driver.onTimeRate - 90) * 1.2,
      8,
      99,
    )

    let score = 100
    score -= emptyMiles * 0.06
    score -= projectedCpm * 14
    score -= resetsNeeded * 7
    score -= Math.max(0, -pickupBufferHours) * 15
    score -= hoursLate * 16
    score += routeFit * 16
    score += (driver.onTimeRate - 90) * 1.5
    score += getStatusModifier(driver.status)
    score -= weatherRisk * 3
    score -= driver.deadheadPct * 0.25

    const candidate = {
      ...driver,
      laneMiles,
      fuelPrice,
      weatherRisk,
      weatherLabel: getWeatherLabel(weatherRisk),
      emptyMiles,
      driveHoursToPickup: round(driveHoursToPickup, 1),
      loadedDriveHours: round(loadedDriveHours, 1),
      totalDriveHours: round(totalDriveHours, 1),
      breaksNeeded: Math.floor(totalDriveHours / 8),
      breakHours: round(breakHours, 1),
      resetsNeeded,
      pickupBufferHours: round(pickupBufferHours, 1),
      pickupFeasible,
      totalServiceHours: round(totalServiceHours, 1),
      deliveryBufferHours: round(deliveryBufferHours, 1),
      hoursLate: round(hoursLate, 1),
      routeFit,
      fuelCost: round(fuelCost, 0),
      projectedTripCost: round(projectedTripCost, 0),
      projectedCpm: round(projectedCpm, 2),
      marginUsd: round(marginUsd, 0),
      onTimeConfidence: Math.round(onTimeConfidence),
      score: clamp(Math.round(score), 1, 99),
    }

    candidate.reasons = buildReasons(candidate, fleetAvgCpm)
    return [candidate]
  })

  return {
    candidates,
    options: candidates,
    laneMiles,
    weatherRisk,
    weatherLabel: getWeatherLabel(weatherRisk),
    fuelPrice,
    hoursUntilPickup: round(hoursUntilPickup, 1),
    hoursUntilDelivery: round(hoursUntilDelivery, 1),
    currentTime,
  }
}

export function buildDispatchDecisionFromRanking(candidates, load, options = {}) {
  const {
    rankedDriverIds = [],
    summary = '',
    whyNotNearest = '',
    driverRationales = {},
    confidence = null,
    metadata = {},
  } = options

  if (!candidates.length) {
    return {
      error: 'No candidates available for dispatch',
      options: [],
      rankedDriverIds: [],
      confidence,
      metadata,
    }
  }

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const fallbackRanked = sortByScoreDescending(candidates)
  const seenIds = new Set()
  const ranked = []

  rankedDriverIds.forEach((id) => {
    if (seenIds.has(id) || !byId.has(id)) return
    const candidate = byId.get(id)
    ranked.push({
      ...candidate,
      llmReason: driverRationales[id] || candidate.reasons[0],
    })
    seenIds.add(id)
  })

  fallbackRanked.forEach((candidate) => {
    if (seenIds.has(candidate.id)) return
    ranked.push({
      ...candidate,
      llmReason: driverRationales[candidate.id] || candidate.reasons[0],
    })
    seenIds.add(candidate.id)
  })

  const naiveChoice = [...candidates]
    .filter((candidate) => !candidate.status.toLowerCase().includes('reset'))
    .sort((a, b) => a.emptyMiles - b.emptyMiles)[0]

  const recommended = ranked[0]
  const savingsVsNaive = naiveChoice
    ? Math.max(0, Math.round(naiveChoice.projectedTripCost - recommended.projectedTripCost))
    : 0

  const defaultSummary = `Assign ${recommended.name}. They are not the closest truck, but they balance pickup feasibility, lower projected CPM, and strong historical performance on the ${load.origin} to ${load.destination} corridor.`
  const defaultWhyNotNearest =
    naiveChoice && naiveChoice.id !== recommended.id
      ? `${naiveChoice.name} is the nearest truck at ${naiveChoice.emptyMiles} empty miles, but ${naiveChoice.pickupFeasible ? 'their HOS and cost profile still underperform' : 'they miss the pickup window'}: ${naiveChoice.resetsNeeded} reset${naiveChoice.resetsNeeded === 1 ? '' : 's'} and ${naiveChoice.projectedCpm.toFixed(2)} CPM. ${recommended.name} adds more repositioning, but protects service and saves about $${savingsVsNaive.toLocaleString()} on this load.`
      : 'The smartest choice also happens to be your nearest workable truck.'

  const dispatchBrief = `${summary || defaultSummary} Expect ${recommended.emptyMiles} empty miles to pickup, ${recommended.resetsNeeded} reset${recommended.resetsNeeded === 1 ? '' : 's'} on trip, and ${recommended.onTimeConfidence}% on-time confidence. Choosing ${recommended.name} instead of the nearest truck saves about $${savingsVsNaive.toLocaleString()}.`

  return {
    options: ranked,
    recommended,
    naiveChoice,
    summary: summary || defaultSummary,
    dispatchBrief,
    whyNotNearest: whyNotNearest || defaultWhyNotNearest,
    savingsVsNaive,
    laneMiles: recommended.laneMiles,
    weatherRisk: recommended.weatherRisk,
    weatherLabel: recommended.weatherLabel,
    fuelPrice: recommended.fuelPrice,
    rankedDriverIds: ranked.map((candidate) => candidate.id),
    confidence: confidence ?? clamp(recommended.score + 3, 1, 99),
    metadata,
  }
}

export function buildDeterministicDispatchDecision(drivers, load, options = {}) {
  const snapshot = buildDispatchCandidates(drivers, load, options)

  if (snapshot.error) {
    return snapshot
  }

  const ranked = sortByScoreDescending(snapshot.candidates)

  return buildDispatchDecisionFromRanking(snapshot.candidates, load, {
    rankedDriverIds: ranked.map((candidate) => candidate.id),
    confidence: ranked[0]?.score ?? null,
    metadata: {
      provider: 'heuristic',
      model: 'deterministic',
      fallbackUsed: true,
      fallbackReason: 'Deterministic dispatch engine',
    },
  })
}

export function runDispatchAnalysis(drivers, load, liveWeatherRisk = null, currentTime = demoClock) {
  return buildDeterministicDispatchDecision(drivers, load, {
    liveWeatherRisk,
    currentTime,
  })
}
