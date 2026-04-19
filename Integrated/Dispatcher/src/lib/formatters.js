export function formatCurrency(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value || 0))
}

export function formatCpm(value) {
  return `${formatCurrency(value, 2)}/mi`
}

export function formatMiles(value) {
  return `${Math.round(Number(value || 0)).toLocaleString()} mi`
}

export function formatHours(value) {
  const numeric = Number(value || 0)
  if (numeric < 1) {
    return `${Math.round(numeric * 60)} min`
  }
  return `${numeric.toFixed(1)} hr`
}

export function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function getStatusTone(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('risk') || normalized.includes('violation')) return 'red'
  if (normalized.includes('loading') || normalized.includes('driving')) return 'amber'
  if (normalized.includes('reset')) return 'slate'
  return 'green'
}

export function hoursBetween(later, earlier) {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / 3600000
}

export function formatDateTime(dateLike) {
  const date = new Date(dateLike)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
