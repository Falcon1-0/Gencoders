export const driverProfile = {
  name: 'Maria Torres',
  truckId: 'TRK-A14',
  truckName: 'Sentinel Runner',
  truckType: 'Sleeper · Dry van · 53 ft',
  currentLocation: 'Phoenix, AZ',
  safetyRating: 4.8,
  driverOfMonth: true,
  hosRemaining: '08h 42m',
  dutyStatus: 'Driving window active',
  fuelTankPercent: 31,
  alarmThreshold: 25,
  currentFuelRange: 186,
  weeklyScore: 96,
  emergencyHealth: 'Stable',
  completedEarningsThisWeek: 4120,
  currentLoadPayout: 1840,
  doorsLocked: true,
  trailerLocked: true,
  batteryHealth: 'Healthy',
  tirePressure: 'Normal',
  engineHealth: 'Nominal',
  reeferStatus: 'Not in use'
}

export const tripDraft = {
  source: 'Phoenix, AZ',
  destination: 'Dallas, TX',
  sourceCoords: { lat: 33.4484, lng: -112.0740 },
  destinationCoords: { lat: 32.7767, lng: -96.7970 },
  pickupWindow: 'Today · 03:30 PM',
  trailer: 'Dry van',
  cargo: 'Retail goods',
  cargoPriority: 'High-value load',
  deliveryType: 'Expedited retail delivery',
  weatherNote: 'Crosswinds near eastern New Mexico after 7 PM.'
}

export const routeOptions = [
  {
    id: 'shortest',
    label: 'Shortest distance',
    mapUrl: 'https://maps.google.com/maps?output=embed&f=d&source=s_d&saddr=Phoenix,AZ&daddr=Dallas,TX',
    waypoints: [],
    overlayPath: [
      { top: 72, left: 16 },
      { top: 66, left: 21 },
      { top: 58, left: 28 },
      { top: 50, left: 37 },
      { top: 43, left: 48 },
      { top: 38, left: 58 },
      { top: 34, left: 67 },
      { top: 31, left: 74 }
    ],
    incidentTags: [
      { id: 'shortest-incident', label: 'Lane closure', detail: 'Amarillo WB · 14 min delay', top: 34, left: 67, tone: 'danger' }
    ],
    fuelTags: [
      { id: 'shortest-fuel', label: 'Higher fuel band', detail: '$3.91/gal corridor', top: 44, left: 51, tone: 'warning' }
    ],
    mileage: 1064,
    eta: '16h 05m',
    estimatedFuelCost: 598,
    tollCost: 42,
    traffic: 'Moderate',
    blockage: 'Minor lane closure near Amarillo',
    risk: 'watch',
    summary: 'Best when the team wants lower mileage with manageable congestion.'
  },
  {
    id: 'traffic',
    label: 'Least traffic',
    mapUrl: 'https://maps.google.com/maps?output=embed&f=d&source=s_d&saddr=Phoenix,AZ&daddr=Albuquerque,NM+to:Dallas,TX',
    waypoints: [{ lat: 35.0844, lng: -106.6504 }],
    overlayPath: [
      { top: 72, left: 16 },
      { top: 64, left: 23 },
      { top: 55, left: 30 },
      { top: 43, left: 39 },
      { top: 36, left: 51 },
      { top: 34, left: 60 },
      { top: 32, left: 68 },
      { top: 30, left: 74 }
    ],
    incidentTags: [
      { id: 'traffic-incident', label: 'Clear corridor', detail: 'No active closures', top: 41, left: 43, tone: 'success' }
    ],
    fuelTags: [
      { id: 'traffic-fuel', label: 'Balanced fuel', detail: '$3.74/gal avg', top: 36, left: 57, tone: 'neutral' }
    ],
    mileage: 1098,
    eta: '15h 42m',
    estimatedFuelCost: 616,
    tollCost: 38,
    traffic: 'Light',
    blockage: 'No major incidents reported',
    risk: 'clear',
    summary: 'Best arrival confidence with fewer urban slowdowns and smoother traffic flow.'
  },
  {
    id: 'cost',
    label: 'Lowest operating cost',
    mapUrl: 'https://maps.google.com/maps?output=embed&f=d&source=s_d&saddr=Phoenix,AZ&daddr=Tucumcari,NM+to:Dallas,TX',
    waypoints: [{ lat: 35.1717, lng: -103.7250 }],
    overlayPath: [
      { top: 72, left: 16 },
      { top: 65, left: 25 },
      { top: 58, left: 34 },
      { top: 49, left: 44 },
      { top: 43, left: 55 },
      { top: 38, left: 64 },
      { top: 34, left: 71 },
      { top: 31, left: 76 }
    ],
    incidentTags: [
      { id: 'cost-incident', label: 'Construction', detail: 'Tucumcari merge slowdown', top: 48, left: 44, tone: 'warning' }
    ],
    fuelTags: [
      { id: 'cost-fuel', label: 'Best fuel zone', detail: '$3.58/gal stop cluster', top: 39, left: 63, tone: 'success' }
    ],
    mileage: 1116,
    eta: '16h 18m',
    estimatedFuelCost: 574,
    tollCost: 14,
    traffic: 'Moderate',
    blockage: 'Construction zone outside Tucumcari',
    risk: 'alert',
    summary: 'Best if saving tolls and fuel spend matters more than total trip time.'
  }
]

export const restStops = [
  { name: 'Flying J Travel Center', distance: '42 mi ahead', spaces: '27 open', amenities: 'Showers · Food · Parking' },
  { name: 'Pilot in Holbrook', distance: '184 mi ahead', spaces: '11 open', amenities: 'Fuel · Service · Laundry' },
  { name: 'TX Rest Area I-40 E', distance: '311 mi ahead', spaces: 'Rest area', amenities: 'Restrooms · Dog walk' }
]

export const fuelIntel = {
  averagePrice: '$3.78/gal',
  bestStop: 'Love’s Amarillo East',
  bestPrice: '$3.61/gal',
  nextRefuelWindow: 'Refuel in 58 miles to avoid high-price corridor',
  tankStatus: 'Tank is trending low for overnight delivery window'
}

export const liveRoutePulse = [
  { location: 'Phoenix, AZ', fuelPercent: 31, range: 186, traffic: 'Light', etaShiftMinutes: 0, speed: 62, distanceLeft: 1098, hosLeftHours: 8.7 },
  { location: 'Holbrook, AZ', fuelPercent: 28, range: 165, traffic: 'Moderate', etaShiftMinutes: 6, speed: 59, distanceLeft: 924, hosLeftHours: 7.5 },
  { location: 'Gallup, NM', fuelPercent: 24, range: 142, traffic: 'Moderate', etaShiftMinutes: 10, speed: 57, distanceLeft: 807, hosLeftHours: 6.4 },
  { location: 'Albuquerque, NM', fuelPercent: 21, range: 114, traffic: 'Heavy near interchange', etaShiftMinutes: 18, speed: 43, distanceLeft: 641, hosLeftHours: 5.2 },
  { location: 'Santa Rosa, NM', fuelPercent: 36, range: 228, traffic: 'Light', etaShiftMinutes: 9, speed: 63, distanceLeft: 517, hosLeftHours: 8.9 },
  { location: 'Amarillo, TX', fuelPercent: 29, range: 181, traffic: 'Watch construction', etaShiftMinutes: 13, speed: 55, distanceLeft: 366, hosLeftHours: 7.3 },
  { location: 'Wichita Falls, TX', fuelPercent: 19, range: 102, traffic: 'Light', etaShiftMinutes: 16, speed: 60, distanceLeft: 139, hosLeftHours: 5.8 },
  { location: 'Dallas, TX', fuelPercent: 14, range: 74, traffic: 'Urban arrival congestion', etaShiftMinutes: 24, speed: 21, distanceLeft: 0, hosLeftHours: 4.9 }
]

export const truckerPathFeatureSet = [
  'Truck-safe route planning',
  'Customized last-mile dock guidance',
  'Parking, fuel stops, weigh stations, and custom POIs',
  'Live traffic, weather, alerts, and camera awareness',
  'Profile-based routing by dimensions, axles, weight, and HazMat',
  'Fastest route, preferred roads, and avoid-area choices',
  'Real-time tracking and ELD compliance',
  'Advanced fuel optimization and driver performance analytics'
]

export const nearbyDrivers = [
  { name: 'Raj Singh', distance: '8.2 mi', status: 'Available', lane: 'Phoenix corridor' },
  { name: 'Nadia Volkov', distance: '14.7 mi', status: 'In motion', lane: 'Mesa bypass' },
  { name: 'Derek Patterson', distance: '19.3 mi', status: 'Standby', lane: 'Gilbert freight zone' }
]

export const nearbyServiceOptions = [
  { id: 'fuel', label: 'Fuel stations' },
  { id: 'restroom', label: 'Restrooms' },
  { id: 'driver', label: 'Drivers' },
  { id: 'hospital', label: 'Hospitals' },
  { id: 'resthouse', label: 'Rest houses' }
]

export const nearbyRouteServices = [
  { id: 'fuel-holbrook', type: 'fuel', name: 'Flying J Holbrook', detail: '$3.69/gal · 42 mi ahead', top: 64, left: 23 },
  { id: 'fuel-amarillo', type: 'fuel', name: 'Love’s Amarillo East', detail: '$3.61/gal · Best stop', top: 34, left: 67 },
  { id: 'restroom-gallup', type: 'restroom', name: 'Gallup Plaza Restrooms', detail: 'Clean stop · 7 min', top: 55, left: 31 },
  { id: 'restroom-santarosa', type: 'restroom', name: 'Santa Rosa Travel Center', detail: 'Showers + restrooms', top: 43, left: 53 },
  { id: 'driver-raj', type: 'driver', name: 'Raj Singh', detail: 'Available · 8.2 mi', top: 68, left: 20 },
  { id: 'driver-nadia', type: 'driver', name: 'Nadia Volkov', detail: 'In motion · 14.7 mi', top: 61, left: 28 },
  { id: 'hospital-abq', type: 'hospital', name: 'UNM Sandoval Regional', detail: 'Hospital · 14 min off route', top: 49, left: 41 },
  { id: 'hospital-wichita', type: 'hospital', name: 'United Regional', detail: 'ER access · 11 min', top: 32, left: 71 },
  { id: 'resthouse-az', type: 'resthouse', name: 'I-40 Rest Area East', detail: 'Rest house · 29 open spots', top: 58, left: 27 },
  { id: 'resthouse-tx', type: 'resthouse', name: 'TX Safety Rest Plaza', detail: 'Quiet parking · 18 open', top: 36, left: 64 }
]

export const nextLoadHotspots = [
  {
    id: 'dallas-retail',
    city: 'Dallas Freight District',
    demandLevel: 'Very high',
    activeLoads: 34,
    avgRate: '$3,480',
    note: 'Strong outbound demand for dry van and retail replenishment.',
    intensity: 92,
    hosReadyIn: '00h 45m',
    projectedNet: '$1,180',
    lane: 'Dallas to Houston',
    freight: 'Retail restock',
    pickupEta: '18 min away',
    requestLabel: 'Request Dallas reload',
    hosRequestReady: false,
    destination: 'Dallas, TX',
    coords: { lat: 32.7767, lng: -96.7970 }
  },
  {
    id: 'fort-worth-warehouse',
    city: 'Fort Worth Alliance Hub',
    demandLevel: 'High',
    activeLoads: 22,
    avgRate: '$3,020',
    note: 'Consistent warehouse volume with fast reload turnaround.',
    intensity: 74,
    hosReadyIn: '01h 10m',
    projectedNet: '$980',
    lane: 'Fort Worth to Oklahoma City',
    freight: 'Warehouse transfer',
    pickupEta: '27 min away',
    requestLabel: 'Request Alliance load',
    hosRequestReady: false,
    destination: 'Fort Worth, TX',
    coords: { lat: 32.7555, lng: -97.3308 }
  },
  {
    id: 'amarillo-regional',
    city: 'Amarillo Cross-Dock Row',
    demandLevel: 'Medium',
    activeLoads: 11,
    avgRate: '$2,260',
    note: 'Lower demand, but useful for short repositioning runs.',
    intensity: 51,
    hosReadyIn: 'Immediate',
    projectedNet: '$620',
    lane: 'Amarillo to Albuquerque',
    freight: 'Regional replenishment',
    pickupEta: '11 min away',
    requestLabel: 'Request Amarillo run',
    hosRequestReady: true,
    destination: 'Amarillo, TX',
    coords: { lat: 35.2219, lng: -101.8313 }
  },
  {
    id: 'okc-grocery',
    city: 'Oklahoma City Produce Ring',
    demandLevel: 'High',
    activeLoads: 19,
    avgRate: '$2,940',
    note: 'Steady reefer and dry van demand with fast turn times.',
    intensity: 69,
    hosReadyIn: '00h 20m',
    projectedNet: '$910',
    lane: 'Oklahoma City to Little Rock',
    freight: 'Grocery restock',
    pickupEta: '24 min away',
    requestLabel: 'Request OKC grocery load',
    hosRequestReady: false,
    destination: 'Oklahoma City, OK',
    coords: { lat: 35.4676, lng: -97.5164 }
  },
  {
    id: 'wichita-manufacturing',
    city: 'Wichita Falls Industrial Yard',
    demandLevel: 'Medium',
    activeLoads: 14,
    avgRate: '$2,510',
    note: 'Shorter industrial runs with predictable loading windows.',
    intensity: 58,
    hosReadyIn: 'Immediate',
    projectedNet: '$760',
    lane: 'Wichita Falls to DFW',
    freight: 'Manufacturing transfer',
    pickupEta: '13 min away',
    requestLabel: 'Request Wichita load',
    hosRequestReady: true,
    destination: 'Wichita Falls, TX',
    coords: { lat: 33.9137, lng: -98.4934 }
  },
  {
    id: 'little-rock-freight',
    city: 'Little Rock Freight Belt',
    demandLevel: 'Very high',
    activeLoads: 26,
    avgRate: '$3,360',
    note: 'High-paying outbound lanes with strong evening demand.',
    intensity: 83,
    hosReadyIn: '01h 05m',
    projectedNet: '$1,040',
    lane: 'Little Rock to Memphis',
    freight: 'Consumer packaged goods',
    pickupEta: '31 min away',
    requestLabel: 'Request Little Rock lane',
    hosRequestReady: false,
    destination: 'Little Rock, AR',
    coords: { lat: 34.7465, lng: -92.2896 }
  }
]

export const hosTimeline = [
  { label: 'Drive left', value: '08h 42m' },
  { label: 'On-duty left', value: '10h 10m' },
  { label: 'Break due', value: 'in 02h 15m' },
  { label: 'Cycle recap', value: '58 / 70h used' }
]

export const chatSuggestions = [
  'Find the safest route with the fewest restrictions.',
  'Show cheaper fuel within my next 120 miles.',
  'Tell dispatcher I may miss the current ETA by 20 minutes.',
  'Where is the nearest rest stop with parking available?'
]

export const emergencyContacts = [
  { label: 'Dispatcher command', value: '+1 (602) 555-0177', callNumber: '+16025550177', note: 'Primary operations desk' },
  { label: 'Nearest support driver', value: 'Raj Singh · 8.2 mi away', callNumber: '+16025550142', note: 'Can respond first on corridor' },
  { label: 'Emergency services', value: '911', callNumber: '911', note: 'Use for crash, medical, fire, or total vehicle failure' }
]

export const dispatcherSnapshot = {
  activeDrivers: 18,
  activeTrips: 11,
  safetyAlerts: 2,
  emergencyReady: true,
  queue: [
    'Emergency workflow routes alerts to dispatcher, nearby driver, and 911.',
    'Fuel alarm flags trucks dropping near the refill threshold.',
    'Route cards show shortest, least-traffic, and lowest-cost choices.',
    'Driver screen is modular so each action is simpler to understand in motion.'
  ]
}

export const agentSystem = {
  orchestrator: {
    name: 'Orchestrator Agent',
    mode: 'Safety-first coordination',
    reasoning: 'Safety overrides profit, then ETA, then earning potential.',
    activeDecision: 'Demand loads are filtered by HOS readiness and route proximity before they reach the map.'
  },
  agents: [
    {
      id: 'navigation',
      name: 'Navigation Agent',
      shortLabel: 'Navigation',
      status: 'Rerouting around traffic near Albuquerque',
      summary: 'Optimizes route, traffic, and road conditions in real time.'
    },
    {
      id: 'demand',
      name: 'Demand Intelligence Agent',
      shortLabel: 'Demand',
      status: 'Ranking profitable loads near Dallas destination',
      summary: 'Finds and prioritizes map bubbles for next loads.'
    },
    {
      id: 'load',
      name: 'Load Monitoring Agent',
      shortLabel: 'Load',
      status: 'Monitoring fuel, cargo, and truck health',
      summary: 'Tracks current load, truck sensors, and trip risk.'
    },
    {
      id: 'nearby',
      name: 'Nearby Drivers Agent',
      shortLabel: 'Nearby',
      status: 'Tracking support drivers in the corridor',
      summary: 'Shows nearby drivers and suggests help when needed.'
    },
    {
      id: 'emergency',
      name: 'Emergency Response Agent',
      shortLabel: 'Emergency',
      status: 'Standing by for crash, stop, or SOS trigger',
      summary: 'Alerts dispatcher, nearby drivers, and emergency services.'
    },
    {
      id: 'communication',
      name: 'Communication Agent',
      shortLabel: 'Voice',
      status: 'Listening for voice or text instructions',
      summary: 'Turns voice/text into actions and routes to humans if needed.'
    },
    {
      id: 'profile',
      name: 'Driver Profile Agent',
      shortLabel: 'Profile',
      status: 'Watching HOS, ratings, and performance history',
      summary: 'Maintains driver insights, compliance, and score trends.'
    }
  ],
  voiceCommands: [
    'Show best loads near my destination',
    'Call nearest driver',
    'What is my fuel status?',
    'Trigger emergency'
  ]
}
