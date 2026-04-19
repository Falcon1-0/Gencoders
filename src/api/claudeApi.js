// ─────────────────────────────────────────────────────────────────────────────
// claudeApi.js — Anthropic Claude API calls for COMMAND SENTINEL
//
// All prompts are structured so Claude responds strictly in JSON.
// Includes graceful fallback when API key is missing.
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1000

function getApiKey() {
  return import.meta.env.VITE_ANTHROPIC_API_KEY || ''
}

function hasApiKey() {
  const key = getApiKey()
  return key && key !== 'your_anthropic_key_here'
}

// Core fetch wrapper for Anthropic API
async function callClaude(systemPrompt, userMessage) {
  if (!hasApiKey()) {
    throw new Error('NO_API_KEY')
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''
  return text
}

// Parse JSON from Claude response safely
function parseJsonResponse(text) {
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── 1. AI Driver Recommendation ───────────────────────────────────────────────
// Given a load and top-3 pre-scored drivers, Claude generates plain-English
// justifications and a final ranked recommendation.

const DISPATCH_SYSTEM = `You are SENTINEL AI, a professional fleet dispatch intelligence system for TruckerPath COMMAND.
Your job is to analyze driver-load match data and produce clear, professional dispatch recommendations.
Always respond with ONLY valid JSON — no preamble, no markdown, no explanation outside the JSON.`

export async function getAiDispatchRecommendation(load, topDrivers) {
  const userMsg = `
Analyze these top driver matches for the following load and produce recommendations.

LOAD:
${JSON.stringify({
  id: load.id,
  route: `${load.origin.city}, ${load.origin.state} → ${load.destination.city}, ${load.destination.state}`,
  distanceMiles: load.distanceMiles,
  rate: `$${(load.rateCents / 100).toFixed(0)}`,
  weightLbs: load.weightLbs,
  commodity: load.commodity,
  pickupTime: load.pickupTime,
  priority: load.priority
}, null, 2)}

TOP DRIVERS (pre-scored):
${JSON.stringify(topDrivers.map(d => ({
  rank: d.rank,
  name: d.driver.name,
  hosRemaining: `${d.driver.hosRemaining}h`,
  deadheadMiles: d.deadheadMiles,
  score: d.score,
  cpm: d.driver.cpm,
  reliability: d.reliabilityScore,
  fuelLevel: `${Math.round(d.fuelLevel * 100)}%`,
  location: d.driver.location,
  status: d.driver.status
})), null, 2)}

Respond with this exact JSON structure:
{
  "recommendation": {
    "topPickName": "string",
    "headline": "one sentence (max 15 words) saying who to pick and the single best reason",
    "confidence": "high|medium|low",
    "estimatedProfit": "string like $1,840"
  },
  "drivers": [
    {
      "rank": 1,
      "name": "string",
      "reason": "2 sentences. Sentence 1: what makes them the best choice. Sentence 2: one risk or caveat.",
      "tags": ["tag1", "tag2", "tag3"]
    }
  ],
  "dispatchNote": "One operational note Maria should know before assigning (max 20 words)"
}`

  try {
    const text = await callClaude(DISPATCH_SYSTEM, userMsg)
    return { ok: true, data: parseJsonResponse(text), source: 'claude' }
  } catch (err) {
    if (err.message === 'NO_API_KEY') {
      return { ok: true, data: getFallbackRecommendation(load, topDrivers), source: 'mock' }
    }
    console.error('Claude dispatch error:', err)
    return { ok: true, data: getFallbackRecommendation(load, topDrivers), source: 'mock' }
  }
}

// Fallback when no API key is set
function getFallbackRecommendation(load, topDrivers) {
  const top = topDrivers[0]
  if (!top) return null
  const profitEst = Math.round((load.rateCents / 100) * 0.45)
  return {
    recommendation: {
      topPickName: top.driver.name,
      headline: `${top.driver.name} is the optimal choice — highest HOS-to-deadhead ratio.`,
      confidence: top.score > 5 ? 'high' : 'medium',
      estimatedProfit: `$${profitEst.toLocaleString()}`
    },
    drivers: topDrivers.slice(0, 3).map((d, i) => ({
      rank: i + 1,
      name: d.driver.name,
      reason: `${d.driver.name} has ${d.driver.hosRemaining}h HOS and is ${d.deadheadMiles} miles from pickup. ${d.deadheadWarning ? 'Deadhead exceeds 50mi — factor fuel cost.' : 'Excellent position relative to origin.'}`,
      tags: [
        `${d.driver.hosRemaining}h HOS`,
        `${d.deadheadMiles}mi deadhead`,
        `${d.reliabilityScore}% reliable`
      ]
    })),
    dispatchNote: `Confirm ${top.driver.name} acknowledges ${load.commodity} load before assigning.`
  }
}

// ── 2. AI Cost Insight ────────────────────────────────────────────────────────
// Claude analyzes fleet CPM data and generates one sharp insight card.

const COST_SYSTEM = `You are SENTINEL AI, a fleet cost intelligence engine.
Analyze trucking cost data and surface the single most actionable insight.
Respond ONLY with valid JSON — no markdown, no explanation outside the JSON.`

export async function getAiCostInsight(fleetMetrics, drivers) {
  const highCpmDrivers = drivers
    .filter(d => d.cpm > fleetMetrics.avgCpm * 1.1)
    .map(d => ({ name: d.name, cpm: d.cpm, status: d.status, hosWith: d.hosRemaining }))

  const userMsg = `
Fleet metrics this week:
${JSON.stringify(fleetMetrics, null, 2)}

Drivers above average CPM:
${JSON.stringify(highCpmDrivers, null, 2)}

Fleet average CPM: $${fleetMetrics.avgCpm}

Generate one sharp cost insight. Respond with:
{
  "title": "short title (5 words max)",
  "severity": "warning|critical|info",
  "insight": "2 sentences. What the data shows + exact dollar impact.",
  "action": "One concrete action Maria should take today (max 15 words)"
}`

  try {
    const text = await callClaude(COST_SYSTEM, userMsg)
    return { ok: true, data: parseJsonResponse(text), source: 'claude' }
  } catch (err) {
    return {
      ok: true,
      source: 'mock',
      data: {
        title: 'CPM outlier detected',
        severity: 'warning',
        insight: `Johnson's CPM of $2.34 is 27% above fleet average — driven by 3 forced HOS stops in high-cost fuel corridors on I-10 this week. This single driver added ~$290 in excess fuel cost.`,
        action: 'Route Johnson via I-20 next run to avoid high-cost corridor.'
      }
    }
  }
}
