export const SLA_AGE_BANDS = ["new", "older", "urgent"] as const

export type SlaAgeBand = (typeof SLA_AGE_BANDS)[number]

export type SlaAge = {
  readonly band: SlaAgeBand
  readonly label: string
  readonly detail: string
}

const MINUTE_MS = 60_000
const HOUR_MINUTES = 60
const DAY_MINUTES = 24 * HOUR_MINUTES
const NEW_LIMIT_MINUTES = 120
const URGENT_LIMIT_MINUTES = DAY_MINUTES

function formatAge(minutes: number): string {
  if (minutes < 1) {
    return "방금"
  }

  if (minutes < HOUR_MINUTES) {
    return `${minutes}분`
  }

  if (minutes < DAY_MINUTES) {
    return `${Math.floor(minutes / HOUR_MINUTES)}시간`
  }

  return `${Math.floor(minutes / DAY_MINUTES)}일`
}

export function getSlaAge(receivedAt: string, now: Date = new Date()): SlaAge {
  const receivedTime = new Date(receivedAt).getTime()
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - receivedTime) / MINUTE_MS))
  const label = formatAge(elapsedMinutes)

  if (elapsedMinutes >= URGENT_LIMIT_MINUTES) {
    return { band: "urgent", label: "Urgent", detail: `${label} 경과` }
  }

  if (elapsedMinutes >= NEW_LIMIT_MINUTES) {
    return { band: "older", label: "Older", detail: `${label} 경과` }
  }

  return { band: "new", label: "New", detail: `${label} 경과` }
}
