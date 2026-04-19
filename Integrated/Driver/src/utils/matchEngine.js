// ─────────────────────────────────────────────────────────────────────────────
// matchEngine.js — Smart Match algorithm for driver-load pairing
//
// Score formula:
//   baseScore = (hosRemaining / estimatedTripHours) * (1 / deadheadMiles)
//   finalScore = baseScore * reliabilityMultiplier * equipmentMultiplier
//
// Higher score = better match.
// ─────────────────────────────────────────────────────────────────────────────

const AVERAGE_SPEED_MPH = 55       // conservative trucking average
const MIN_HOS_BUFFER_HOURS = 1.5   // always leave 1.5h buffer
const DEADHEAD_WARNING_MILES = 50  // flag deadhead above this

// Haversine formula: distance in miles between two lat/lng points
function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Estimate trip hours based on load distance
function estimateTripHours(distanceMiles) {
  const driveHours = distanceMiles / AVERAGE_SPEED_MPH
  const stopHours = Math.floor(driveHours / 8) * 0.5 // 30 min per 8h segment
  return driveHours + stopHours
}

// Check equipment compatibility
function isEquipmentCompatible(driverEquipment, loadEquipment) {
  if (driverEquipment === loadEquipment) return true
  // Dry van can haul some reefer loads (broker dependent)
  if (driverEquipment === 'dry_van' && loadEquipment === 'dry_van') return true
  return false
}

// Returns a score object for one driver-load pair
function scoreDriverForLoad(driver, load) {
  const deadheadMiles = haversineDistanceMiles(
    driver.lat, driver.lng,
    load.origin.lat, load.origin.lng
  )

  const tripHours = estimateTripHours(load.distanceMiles)
  const effectiveHos = driver.hosRemaining - MIN_HOS_BUFFER_HOURS
  const equipmentOk = isEquipmentCompatible(driver.equipment, load.equipmentRequired)

  // Driver cannot take load if HOS is insufficient or equipment incompatible
  if (effectiveHos <= 0 || !equipmentOk || driver.status === 'hos_warning') {
    return {
      driverId: driver.id,
      score: 0,
      eligible: false,
      deadheadMiles: Math.round(deadheadMiles),
      tripHours: tripHours.toFixed(1),
      hosRatio: 0,
      reason: equipmentOk ? 'Insufficient HOS' : 'Equipment mismatch'
    }
  }

  // Core score: HOS coverage ratio divided by deadhead penalty
  const hosRatio = effectiveHos / tripHours
  const deadheadPenalty = Math.max(deadheadMiles, 1) // avoid division by zero
  const baseScore = (hosRatio / deadheadPenalty) * 1000

  // Reliability multiplier: 0.7–1.0 based on reliability score
  const reliabilityMultiplier = 0.7 + (driver.reliabilityScore / 100) * 0.3

  // Fuel penalty: low fuel adds risk
  const fuelMultiplier = driver.fuelLevel > 0.25 ? 1.0 : 0.85

  const finalScore = baseScore * reliabilityMultiplier * fuelMultiplier

  return {
    driverId: driver.id,
    score: finalScore,
    eligible: true,
    deadheadMiles: Math.round(deadheadMiles),
    deadheadWarning: deadheadMiles > DEADHEAD_WARNING_MILES,
    tripHours: tripHours.toFixed(1),
    hosRatio: hosRatio.toFixed(2),
    reliabilityScore: driver.reliabilityScore,
    fuelLevel: driver.fuelLevel,
    reason: null
  }
}

// Main export: rank all drivers for a given load, return top N
export function getTopDriversForLoad(drivers, load, topN = 3) {
  const scored = drivers.map(driver => {
    const scoreData = scoreDriverForLoad(driver, load)
    return { driver, ...scoreData }
  })

  const eligible = scored.filter(s => s.eligible)
  const ineligible = scored.filter(s => !s.eligible)

  // Sort eligible drivers by score descending
  eligible.sort((a, b) => b.score - a.score)

  const top = eligible.slice(0, topN).map((item, idx) => ({
    rank: idx + 1,
    driver: item.driver,
    score: Math.round(item.score * 10) / 10,
    deadheadMiles: item.deadheadMiles,
    deadheadWarning: item.deadheadWarning,
    tripHours: item.tripHours,
    hosRatio: item.hosRatio,
    reliabilityScore: item.reliabilityScore,
    fuelLevel: item.fuelLevel
  }))

  const deadheadAlerts = eligible.filter(s => s.deadheadWarning).map(s => ({
    driverName: s.driver.name,
    deadheadMiles: s.deadheadMiles
  }))

  return { top, deadheadAlerts, totalEligible: eligible.length, totalIneligible: ineligible.length }
}

// Utility: format currency from cents
export function formatRate(cents) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// Utility: format HOS hours to "Xh Ym"
export function formatHos(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h 00m`
}

// Utility: get status color class
export function getStatusColor(status) {
  const map = {
    available:   'text-sentinel-green',
    in_transit:  'text-sentinel-cyan',
    loading:     'text-sentinel-amber',
    hos_warning: 'text-sentinel-red',
    off_duty:    'text-gray-400'
  }
  return map[status] || 'text-gray-400'
}

export function getStatusLabel(status) {
  const map = {
    available:   'Available',
    in_transit:  'In Transit',
    loading:     'Loading',
    hos_warning: 'HOS Alert',
    off_duty:    'Off Duty'
  }
  return map[status] || status
}
