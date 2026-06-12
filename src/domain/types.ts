export const CLASSIFICATIONS = [
  "product",
  "quote",
  "booking",
  "support",
  "partnership",
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
  readonly topic: string | null
  readonly productOrService: string | null
  readonly locationOrChannel: string | null
  readonly requestedDateTime: string | null
  readonly budgetOrPrice: string | null
  readonly contact: string | null
  readonly orderOrReservationRef: string | null
  readonly missing: readonly MissingField[]
}

export type MissingField =
  | "topic"
  | "productOrService"
  | "locationOrChannel"
  | "requestedDateTime"
  | "budgetOrPrice"
  | "contact"
  | "orderOrReservationRef"

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
