const loadTemplates = [
  {
    origin: 'Phoenix, AZ',
    destination: 'Dallas, TX',
    equipment: '53\' Dry Van',
    weightLbs: 34000,
    rateUsd: 3425,
    dieselUsdPerGallon: 3.96,
    averageSpeedMph: 57,
    pickupLeadHours: 6,
    deliveryWindowHours: 42,
  },
  {
    origin: 'Phoenix, AZ',
    destination: 'Houston, TX',
    equipment: '53\' Dry Van',
    weightLbs: 32100,
    rateUsd: 3560,
    dieselUsdPerGallon: 3.89,
    averageSpeedMph: 56,
    pickupLeadHours: 4,
    deliveryWindowHours: 39,
  },
  {
    origin: 'Albuquerque, NM',
    destination: 'Dallas, TX',
    equipment: '53\' Dry Van',
    weightLbs: 28600,
    rateUsd: 2980,
    dieselUsdPerGallon: 3.82,
    averageSpeedMph: 58,
    pickupLeadHours: 7,
    deliveryWindowHours: 30,
  },
  {
    origin: 'Dallas, TX',
    destination: 'Memphis, TN',
    equipment: '53\' Dry Van',
    weightLbs: 30400,
    rateUsd: 2415,
    dieselUsdPerGallon: 3.86,
    averageSpeedMph: 58,
    pickupLeadHours: 5,
    deliveryWindowHours: 24,
  },
  {
    origin: 'El Paso, TX',
    destination: 'Los Angeles, CA',
    equipment: '53\' Dry Van',
    weightLbs: 35600,
    rateUsd: 3310,
    dieselUsdPerGallon: 4.18,
    averageSpeedMph: 55,
    pickupLeadHours: 8,
    deliveryWindowHours: 33,
  },
  {
    origin: 'Phoenix, AZ',
    destination: 'San Antonio, TX',
    equipment: '53\' Dry Van',
    weightLbs: 31800,
    rateUsd: 3075,
    dieselUsdPerGallon: 3.88,
    averageSpeedMph: 57,
    pickupLeadHours: 5,
    deliveryWindowHours: 29,
  },
]

function addHours(dateLike, hours) {
  const date = new Date(dateLike)
  date.setTime(date.getTime() + hours * 3600000)
  return date
}

function toInputDate(date) {
  return new Date(date).toISOString().slice(0, 16)
}

export function createSimulatedLoad(sequence, clock) {
  const template = loadTemplates[sequence % loadTemplates.length]
  const pickupAt = addHours(clock, template.pickupLeadHours + (sequence % 3))
  const deliveryBy = addHours(pickupAt, template.deliveryWindowHours + (sequence % 4) * 2)

  return {
    id: `LD-${4400 + sequence}`,
    origin: template.origin,
    destination: template.destination,
    pickupAt: toInputDate(pickupAt),
    deliveryBy: toInputDate(deliveryBy),
    weightLbs: template.weightLbs + (sequence % 4) * 800,
    rateUsd: template.rateUsd + (sequence % 5) * 90,
    equipment: template.equipment,
    dieselUsdPerGallon: Number((template.dieselUsdPerGallon + (sequence % 3) * 0.03).toFixed(2)),
    averageSpeedMph: template.averageSpeedMph,
    priority: sequence % 3 === 0 ? 'Hot' : sequence % 2 === 0 ? 'At Risk' : 'Standard',
  }
}

export function createLoadQueue(startSequence, clock, count = 4) {
  return Array.from({ length: count }, (_, index) =>
    createSimulatedLoad(startSequence + index, clock),
  )
}
