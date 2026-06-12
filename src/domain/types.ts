export const CLASSIFICATIONS = [
  "shooting",
  "quote",
  "schedule",
  "collaboration",
  "spam",
  "other",
] as const

export const STATUSES = ["new", "drafted", "approved", "hold", "ignored"] as const

export type Classification = (typeof CLASSIFICATIONS)[number]
export type Status = (typeof STATUSES)[number]

export type InstagramEvent = {
  readonly id: string
  readonly channel: "dm" | "comment"
  readonly senderName: string
  readonly senderHandle: string
  readonly receivedAt: string
  readonly message: string
}

export type ExtractedFields = {
  readonly shootType: string | null
  readonly location: string | null
  readonly preferredDate: string | null
  readonly budget: string | null
  readonly contact: string | null
  readonly missing: readonly MissingField[]
}

export type MissingField = "shootType" | "location" | "preferredDate" | "budget" | "contact"

export type Analysis = {
  readonly classification: Classification
  readonly confidence: number
  readonly fields: ExtractedFields
}

export type EventState = {
  readonly status: Status
  readonly draft: string
  readonly sentLog: readonly SendLogEntry[]
}

export type SendLogEntry = {
  readonly at: string
  readonly text: string
}

export type EventViewModel = {
  readonly event: InstagramEvent
  readonly analysis: Analysis
  readonly state: EventState
}
