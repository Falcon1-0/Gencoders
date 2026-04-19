import { formatCurrency } from './formatters.js'

function average(list, key) {
  if (!list.length) return 0
  return list.reduce((sum, item) => sum + Number(item[key] || 0), 0) / list.length
}

function normalize(text = '') {
  return text.toLowerCase().trim()
}

function extractDriverNames(question, profiles) {
  const text = normalize(question)
  return profiles.filter((profile) => {
    const full = profile.name.toLowerCase()
    const lastName = full.split(' ').pop()
    return text.includes(full) || text.includes(lastName.replace('.', '')) || text.includes(lastName)
  })
}

function buildFleetBaseline(profiles) {
  return {
    avgCpm: average(profiles, 'avgCpm'),
    fuelCpm: average(profiles, 'fuelCpm'),
    wageCpm: average(profiles, 'wageCpm'),
    maintenanceCpm: average(profiles, 'maintenanceCpm'),
    deadheadCpm: average(profiles, 'deadheadCpm'),
    delayCpm: average(profiles, 'delayCpm'),
    deadheadPct: average(profiles, 'deadheadPct'),
    routeEfficiency: average(profiles, 'routeEfficiency'),
    marginPerMile: average(profiles, 'marginPerMile'),
  }
}

function getTopCostDrivers(profile, baseline) {
  const buckets = [
    {
      label: 'deadhead',
      delta: profile.deadheadCpm - baseline.deadheadCpm,
      value: profile.deadheadCpm,
      insight: `${profile.deadheadPct.toFixed(1)}% of ${profile.name}'s miles are empty repositioning`,
    },
    {
      label: 'fuel',
      delta: profile.fuelCpm - baseline.fuelCpm,
      value: profile.fuelCpm,
      insight: `fuel spend is ${profile.fuelDelta.toFixed(2)} per mile above the fleet's recent baseline`,
    },
    {
      label: 'delay',
      delta: profile.delayCpm - baseline.delayCpm,
      value: profile.delayCpm,
      insight: `${profile.hosResets} HOS resets and ${profile.detentionHours.toFixed(1)} detention hours are inflating idle time`,
    },
    {
      label: 'maintenance',
      delta: profile.maintenanceCpm - baseline.maintenanceCpm,
      value: profile.maintenanceCpm,
      insight: `maintenance is running at ${profile.maintenanceCpm.toFixed(2)} per mile`,
    },
  ]

  return buckets.sort((a, b) => b.delta - a.delta)
}

function driverActions(profile, contributors) {
  const actions = []

  if (contributors[0]?.label === 'deadhead') {
    actions.push('Pre-stage this driver on a return lane before dispatching the next westbound load.')
  }
  if (contributors.some((item) => item.label === 'fuel' && item.delta > 0.04)) {
    actions.push('Push fuel stops into lower-cost networks earlier in the trip instead of refueling after the reset.')
  }
  if (profile.hosResets >= 2 || contributors.some((item) => item.label === 'delay')) {
    actions.push('Prioritize loads with more pickup slack so the driver does not burn a reset before the loaded leg.')
  }
  if (profile.routeEfficiency < 90) {
    actions.push('Coach on route discipline and reduce off-route miles on repeat corridors.')
  }

  return actions.slice(0, 3)
}

function buildDriverAnswer(profile, baseline) {
  const delta = profile.avgCpm - baseline.avgCpm
  const contributors = getTopCostDrivers(profile, baseline).filter((item) => item.delta > 0).slice(0, 3)
  const actions = driverActions(profile, contributors)

  return {
    title: `${profile.name} is ${delta.toFixed(2)} above fleet average CPM`,
    narrative: `${profile.name} is running at ${profile.avgCpm.toFixed(2)} CPM versus a fleet baseline of ${baseline.avgCpm.toFixed(2)}. The biggest drivers are ${contributors
      .map((item) => item.label)
      .join(', ')}. In practical terms, ${contributors[0]?.insight || 'costs are being driven by a mix of empty miles and delay time'}.`,
    bullets: contributors.map(
      (item) => `${item.label}: ${item.insight}`,
    ),
    actions,
    metrics: [
      { label: 'Current CPM', value: `$${profile.avgCpm.toFixed(2)}` },
      { label: 'Deadhead', value: `${profile.deadheadPct.toFixed(1)}%` },
      { label: 'Margin', value: `$${profile.marginPerMile.toFixed(2)}/mi` },
      { label: 'On-time', value: `${profile.onTimeRate}%` },
    ],
    speechText: `${profile.name} is ${delta.toFixed(2)} dollars per mile above fleet average. Biggest pressure points are ${contributors
      .map((item) => item.label)
      .join(', ')}. First action: ${actions[0] || 'reduce empty miles on the next assignment.'}`,
  }
}

function buildLaneAnswer(laneAnalytics) {
  const lane = [...laneAnalytics].sort((a, b) => a.avgMarginPerMile - b.avgMarginPerMile)[0]
  return {
    title: `${lane.lane} is the lane hurting margin most`,
    narrative: `${lane.lane} is the weakest corridor in the current demo data. It is running at ${lane.avgCpm.toFixed(2)} CPM and only ${lane.avgMarginPerMile.toFixed(2)} margin per mile, mostly because ${lane.issue.toLowerCase()}.`,
    bullets: [
      `Average CPM: $${lane.avgCpm.toFixed(2)}`,
      `Average margin: $${lane.avgMarginPerMile.toFixed(2)}/mi`,
      `Deadhead exposure: ${lane.deadheadPct}%`,
      `Weather risk: ${lane.weatherRisk}`,
    ],
    actions: [
      'Use the smart dispatch ranker to keep high-reset drivers off this corridor.',
      'Bundle a backhaul before tendering this lane so empty reposition does not erase margin.',
      'Move fuel decisions earlier in the trip to avoid refueling in the highest-cost section of the lane.',
    ],
    metrics: [
      { label: 'Lane', value: lane.lane.split(' -> ')[0] },
      { label: 'Loads', value: `${lane.loads}` },
      { label: 'CPM', value: `$${lane.avgCpm.toFixed(2)}` },
      { label: 'Margin', value: `$${lane.avgMarginPerMile.toFixed(2)}` },
    ],
    speechText: `${lane.lane} is the weakest lane right now. Margin is only ${lane.avgMarginPerMile.toFixed(2)} per mile because ${lane.issue.toLowerCase()}`,
  }
}

function buildDeadheadSimulation(profiles, percent = 10) {
  const savings = profiles.reduce((sum, profile) => {
    const reducedEmptyMiles = profile.emptyMiles * (percent / 100)
    return sum + reducedEmptyMiles * profile.avgCpm * 0.62
  }, 0)

  const reclaimedMargin = savings / profiles.length
  return {
    title: `Cutting deadhead by ${percent}% saves about ${formatCurrency(savings, 0)} per fleet-week`,
    narrative: `The current demo fleet is carrying a lot of hidden cost in empty repositioning. A ${percent}% reduction in deadhead would save roughly ${formatCurrency(savings, 0)} per fleet-week, or about ${formatCurrency(reclaimedMargin, 0)} per driver, without changing rates or adding trucks.`,
    bullets: [
      'Savings estimate uses each driver\'s current CPM and empty-mile pattern.',
      'The largest savings would come from Johnson, Hernandez, and Williams.',
      'This is exactly why dispatch assignment and cost intelligence should live in the same workflow.',
    ],
    actions: [
      'Rank drivers by empty miles before each tender is assigned.',
      'Reserve higher-cost drivers for lanes where they already have backhaul options.',
      'Create a rule that flags any assignment above 18% expected deadhead before dispatch approval.',
    ],
    metrics: [
      { label: 'Weekly savings', value: formatCurrency(savings, 0) },
      { label: 'Per driver', value: formatCurrency(reclaimedMargin, 0) },
      { label: 'Focus drivers', value: '3' },
      { label: 'Fastest lever', value: 'Assignment logic' },
    ],
    speechText: `If you cut deadhead by ${percent} percent, the fleet saves about ${Math.round(savings).toLocaleString()} dollars per week. The biggest savings sit in your highest-cost westbound drivers.`,
  }
}

function buildCoachAnswer(profiles, baseline) {
  const ordered = [...profiles].sort((a, b) => b.avgCpm - a.avgCpm)
  const top = ordered[0]
  const second = ordered[1]
  return {
    title: `Coach ${top.name} first, then ${second.name}`,
    narrative: `${top.name} is the fastest coaching win because they combine the highest CPM, the lowest margin per mile, and the highest deadhead share in the fleet. ${second.name} is next because repeated resets and detention are turning otherwise workable lanes into expensive ones.`,
    bullets: [
      `${top.name}: ${top.avgCpm.toFixed(2)} CPM, ${top.deadheadPct.toFixed(1)}% deadhead, ${top.hosResets} resets`,
      `${second.name}: ${second.avgCpm.toFixed(2)} CPM, ${second.deadheadPct.toFixed(1)}% deadhead, ${second.hosResets} resets`,
      `Fleet baseline for comparison: ${baseline.avgCpm.toFixed(2)} CPM`,
    ],
    actions: [
      `Remove ${top.name} from the most expensive corridor until a return load is pre-booked.`,
      `Give ${second.name} a lane with wider appointment windows for the next 2-3 loads.`,
      'Review fueling timing and after-hours detention causes with both drivers.',
    ],
    metrics: [
      { label: 'Primary coach', value: top.name },
      { label: 'Backup coach', value: second.name },
      { label: 'Fleet CPM', value: `$${baseline.avgCpm.toFixed(2)}` },
      { label: 'Win type', value: 'Margin recovery' },
    ],
    speechText: `${top.name} should be coached first, followed by ${second.name}. That is where the fastest margin recovery lives.`,
  }
}

function buildCompareAnswer(a, b, baseline) {
  const cheaper = a.avgCpm <= b.avgCpm ? a : b
  const pricier = cheaper.name === a.name ? b : a
  return {
    title: `${cheaper.name} is the better cost profile today`,
    narrative: `${cheaper.name} is ${Math.abs(cheaper.avgCpm - pricier.avgCpm).toFixed(2)} CPM cheaper than ${pricier.name}. The gap is mostly explained by lower deadhead and fewer delay-driven resets.`,
    bullets: [
      `${cheaper.name}: ${cheaper.avgCpm.toFixed(2)} CPM and ${cheaper.deadheadPct.toFixed(1)}% deadhead`,
      `${pricier.name}: ${pricier.avgCpm.toFixed(2)} CPM and ${pricier.deadheadPct.toFixed(1)}% deadhead`,
      `Fleet average: ${baseline.avgCpm.toFixed(2)} CPM`,
    ],
    actions: [
      `Use ${cheaper.name} as the template for lane assignment on this corridor.`,
      `Audit why ${pricier.name} is taking more empty reposition and delay time.`,
      'Revisit appointment slack before assigning the next multi-state load.',
    ],
    metrics: [
      { label: 'Cheaper driver', value: cheaper.name },
      { label: 'Gap', value: `$${Math.abs(cheaper.avgCpm - pricier.avgCpm).toFixed(2)}` },
      { label: 'Deadhead gap', value: `${Math.abs(cheaper.deadheadPct - pricier.deadheadPct).toFixed(1)}%` },
      { label: 'Mode', value: 'Comparison' },
    ],
    speechText: `${cheaper.name} has the better cost profile. The difference is mostly deadhead and delay time.`,
  }
}

function buildFleetSummary(profiles, baseline) {
  const highest = [...profiles].sort((a, b) => b.avgCpm - a.avgCpm)[0]
  const lowest = [...profiles].sort((a, b) => a.avgCpm - b.avgCpm)[0]
  return {
    title: 'Fleet cost story in one view',
    narrative: `Fleet average CPM is ${baseline.avgCpm.toFixed(2)}. ${highest.name} is your biggest cost outlier, while ${lowest.name} is the benchmark profile to copy. The main leak across the fleet is not base fuel price alone - it is the combination of empty miles, delayed resets, and lane mismatch.`,
    bullets: [
      `${highest.name} is highest at ${highest.avgCpm.toFixed(2)} CPM`,
      `${lowest.name} is lowest at ${lowest.avgCpm.toFixed(2)} CPM`,
      `Fleet average deadhead is ${baseline.deadheadPct.toFixed(1)}%`,
      `Average margin is ${formatCurrency(baseline.marginPerMile, 2)}/mi`,
    ],
    actions: [
      'Use smart dispatch to remove preventable empty miles at assignment time.',
      'Flag any driver projected above fleet CPM before confirming the tender.',
      'Coach the two highest-reset drivers on lane fit and fueling timing.',
    ],
    metrics: [
      { label: 'Fleet CPM', value: `$${baseline.avgCpm.toFixed(2)}` },
      { label: 'Deadhead', value: `${baseline.deadheadPct.toFixed(1)}%` },
      { label: 'Best profile', value: lowest.name },
      { label: 'Highest risk', value: highest.name },
    ],
    speechText: `Fleet average is ${baseline.avgCpm.toFixed(2)} CPM. Biggest outlier is ${highest.name}. The main leak is empty miles plus reset-driven delay.`,
  }
}

export function buildCostMetrics(profiles) {
  const baseline = buildFleetBaseline(profiles)
  const highestRisk = [...profiles].sort((a, b) => b.avgCpm - a.avgCpm)[0]
  const totalLoadedMiles = profiles.reduce((sum, profile) => sum + profile.loadedMiles, 0)
  const avgOnTime = average(profiles, 'onTimeRate')

  return [
    {
      label: 'Fleet Avg CPM',
      value: `$${baseline.avgCpm.toFixed(2)}`,
      hint: 'Across all active drivers this week',
    },
    {
      label: 'Loaded Miles',
      value: totalLoadedMiles.toLocaleString(),
      hint: 'Miles producing revenue this week',
    },
    {
      label: 'Highest Risk Driver',
      value: highestRisk.name,
      hint: `${highestRisk.avgCpm.toFixed(2)} CPM and ${highestRisk.deadheadPct.toFixed(1)}% deadhead`,
    },
    {
      label: 'On-Time Rate',
      value: `${Math.round(avgOnTime)}%`,
      hint: 'Measured against final appointment times',
    },
  ]
}

export function answerCostQuestion(question, profiles, laneAnalytics) {
  const baseline = buildFleetBaseline(profiles)
  const matchedDrivers = extractDriverNames(question, profiles)
  const text = normalize(question)

  if (matchedDrivers.length >= 2) {
    return buildCompareAnswer(matchedDrivers[0], matchedDrivers[1], baseline)
  }

  if (matchedDrivers.length === 1 && (text.includes('why') || text.includes('high') || text.includes('cost'))) {
    return buildDriverAnswer(matchedDrivers[0], baseline)
  }

  if (text.includes('lane') || text.includes('corridor') || text.includes('margin')) {
    return buildLaneAnswer(laneAnalytics)
  }

  if ((text.includes('deadhead') && text.includes('%')) || text.includes('cut deadhead') || text.includes('reduce deadhead') || text.includes('what happens')) {
    const match = text.match(/(\d{1,2})\s?%/)
    const percent = match ? Number(match[1]) : 10
    return buildDeadheadSimulation(profiles, percent)
  }

  if (text.includes('coach') || text.includes('who should') || text.includes('who do we coach')) {
    return buildCoachAnswer(profiles, baseline)
  }

  if (matchedDrivers.length === 1) {
    return buildDriverAnswer(matchedDrivers[0], baseline)
  }

  return buildFleetSummary(profiles, baseline)
}
