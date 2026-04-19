import { defaultLoad, demoClock, drivers as seedDrivers } from '../../src/data/mockData.js'
import { clamp } from '../../src/lib/formatters.js'
import { createLoadQueue, createSimulatedLoad } from './sampleLoads.js'

const driverRoutes = {
  'DRV-201': ['Tucson, AZ', 'Phoenix, AZ', 'Albuquerque, NM', 'Dallas, TX'],
  'DRV-202': ['Phoenix, AZ', 'Mesa, AZ', 'Lubbock, TX', 'Dallas, TX'],
  'DRV-203': ['El Paso, TX', 'Phoenix, AZ', 'Los Angeles, CA'],
  'DRV-204': ['Albuquerque, NM', 'Lubbock, TX', 'Dallas, TX'],
  'DRV-205': ['Amarillo, TX', 'Dallas, TX', 'San Antonio, TX'],
  'DRV-206': ['Flagstaff, AZ', 'Phoenix, AZ', 'Dallas, TX'],
  'DRV-207': ['Oklahoma City, OK', 'Amarillo, TX', 'Phoenix, AZ'],
  'DRV-208': ['Little Rock, AR', 'Dallas, TX', 'Memphis, TN'],
}

const statusCycle = ['Driving', 'Available', 'Loading', 'Available', 'Resetting']

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function addMinutes(dateLike, minutes) {
  const date = new Date(dateLike)
  date.setTime(date.getTime() + minutes * 60000)
  return date
}

function toInputDate(date) {
  return new Date(date).toISOString().slice(0, 16)
}

function toIso(date) {
  return new Date(date).toISOString()
}

function buildEvent(id, timestamp, title, detail, tone = 'cyan') {
  return {
    id,
    timestamp,
    title,
    detail,
    tone,
  }
}

function mutateDriver(driver, tick, driverIndex, timestamp) {
  const route = driverRoutes[driver.id] || [driver.currentCity, defaultLoad.origin, defaultLoad.destination]
  const phase = (tick + driverIndex) % statusCycle.length
  const routeIndex = Math.floor((tick + driverIndex) / 2) % route.length
  const previousCity = driver.currentCity
  const previousStatus = driver.status

  driver.status = statusCycle[phase]
  driver.currentCity = route[routeIndex]

  if (driver.status === 'Driving') {
    driver.hosDriveHours = clamp(driver.hosDriveHours - 1.4, 0.4, 11)
  } else if (driver.status === 'Resetting') {
    driver.hosDriveHours = clamp(driver.hosDriveHours + 3.2, 0.4, 11)
  } else {
    driver.hosDriveHours = clamp(driver.hosDriveHours + 0.6, 0.4, 11)
  }

  const moved = previousCity !== driver.currentCity
  const statusChanged = previousStatus !== driver.status
  if (!moved && !statusChanged) return null

  if (driver.status === 'Driving') {
    return buildEvent(
      `evt-driver-${timestamp}-${driver.id}`,
      timestamp,
      `${driver.name} is rolling`,
      `${driver.name} checked in near ${driver.currentCity} with ${driver.hosDriveHours.toFixed(1)} HOS hours left.`,
      'cyan',
    )
  }

  if (driver.status === 'Resetting') {
    return buildEvent(
      `evt-driver-${timestamp}-${driver.id}`,
      timestamp,
      `${driver.name} entered reset`,
      `${driver.name} is resetting in ${driver.currentCity}, which may change the board on the next rerank.`,
      'amber',
    )
  }

  return buildEvent(
    `evt-driver-${timestamp}-${driver.id}`,
    timestamp,
    `${driver.name} is now ${driver.status.toLowerCase()}`,
    `${driver.name} updated from ${previousCity} to ${driver.currentCity} at ${toInputDate(timestamp).slice(11)}.`,
    'green',
  )
}

function createInitialState() {
  const clock = toIso(demoClock)
  return {
    tick: 0,
    snapshotVersion: 1,
    clock,
    activeLoad: {
      ...clone(defaultLoad),
      priority: 'Hot',
    },
    queuedLoads: createLoadQueue(1, clock, 4),
    drivers: clone(seedDrivers),
    activity: [
      buildEvent(
        'evt-initial-board',
        clock,
        'Dispatch board online',
        'Simulation started with a hot Phoenix to Dallas load on top of the queue.',
        'cyan',
      ),
    ],
    nextLoadSequence: 5,
  }
}

export function createLiveBoard(options = {}) {
  const {
    tickMs = 5000,
    tickMinutes = 18,
  } = options

  const subscribers = new Set()
  let interval = null
  let state = createInitialState()

  function emit() {
    const snapshot = getSnapshot()
    subscribers.forEach((subscriber) => subscriber(snapshot))
  }

  function pushEvent(event) {
    if (!event) return
    state.activity = [event, ...state.activity].slice(0, 12)
  }

  function reprioritizeActiveLoad(timestamp) {
    const bump = state.tick % 2 === 0 ? 65 : -45
    state.activeLoad.rateUsd = Math.max(1800, state.activeLoad.rateUsd + bump)
    state.activeLoad.priority = state.activeLoad.rateUsd >= 3400 ? 'Hot' : 'At Risk'
    pushEvent(
      buildEvent(
        `evt-rate-${timestamp}`,
        timestamp,
        `${state.activeLoad.id} repriced`,
        `Broker updated the ${state.activeLoad.origin} to ${state.activeLoad.destination} offer to $${state.activeLoad.rateUsd.toLocaleString()}.`,
        bump > 0 ? 'green' : 'amber',
      ),
    )
  }

  function rotateLoad(timestamp) {
    const completedLoad = state.activeLoad
    state.activeLoad = state.queuedLoads.shift()
    state.queuedLoads.push(createSimulatedLoad(state.nextLoadSequence, timestamp))
    state.nextLoadSequence += 1

    pushEvent(
      buildEvent(
        `evt-load-${timestamp}`,
        timestamp,
        `${state.activeLoad.id} moved to the top`,
        `Board promoted ${state.activeLoad.origin} to ${state.activeLoad.destination} after ${completedLoad.id} cleared.`,
        'cyan',
      ),
    )
  }

  function advanceTick() {
    state.tick += 1
    state.snapshotVersion += 1
    state.clock = toIso(addMinutes(state.clock, tickMinutes))

    const primaryIndex = state.tick % state.drivers.length
    const secondaryIndex = (state.tick + 3) % state.drivers.length

    pushEvent(mutateDriver(state.drivers[primaryIndex], state.tick, primaryIndex, state.clock))
    if (state.tick % 2 === 0) {
      pushEvent(mutateDriver(state.drivers[secondaryIndex], state.tick, secondaryIndex, state.clock))
    }

    if (state.tick % 2 === 1) {
      reprioritizeActiveLoad(state.clock)
    }

    if (state.tick % 5 === 0) {
      rotateLoad(state.clock)
    }

    emit()
  }

  function getSnapshot() {
    return clone({
      snapshotVersion: state.snapshotVersion,
      tick: state.tick,
      clock: state.clock,
      activeLoad: state.activeLoad,
      queuedLoads: state.queuedLoads,
      drivers: state.drivers,
      activity: state.activity,
    })
  }

  function subscribe(listener) {
    subscribers.add(listener)
    return () => subscribers.delete(listener)
  }

  function start() {
    if (interval) return
    interval = setInterval(advanceTick, tickMs)
  }

  function stop() {
    if (!interval) return
    clearInterval(interval)
    interval = null
  }

  return {
    advanceTick,
    getSnapshot,
    start,
    stop,
    subscribe,
  }
}
