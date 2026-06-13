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
export const WORKSPACE_PRESETS = ["generic", "ecommerce", "bookingService", "creatorCommunity", "customerSupport"] as const
export const SAMPLE_SCENARIOS = ["generic", "ecommerce", "booking", "support"] as const
export const REPLY_TONES = ["friendly", "concise", "professional", "casual"] as const
export const AUDIT_ACTIONS = ["status-change", "draft-regenerated", "mock-send", "sample-reset"] as const
export const MISSING_FIELDS = [
  "topic",
  "productOrService",
  "locationOrChannel",
  "requestedDateTime",
  "budgetOrPrice",
  "contact",
  "orderOrReservationRef",
] as const

export type Classification = (typeof CLASSIFICATIONS)[number]
export type Status = (typeof STATUSES)[number]
export type WorkspacePreset = (typeof WORKSPACE_PRESETS)[number]
export type SampleScenario = (typeof SAMPLE_SCENARIOS)[number]
export type ReplyTone = (typeof REPLY_TONES)[number]
export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type MissingField = (typeof MISSING_FIELDS)[number]

export type InstagramEvent = {
  readonly id: string
  readonly channel: "dm" | "comment"
  readonly senderName: string
  readonly senderHandle: string
  readonly receivedAt: string
  readonly message: string
  readonly mediaId?: string
  readonly commentId?: string
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

export type UserPreferences = {
  readonly workspacePreset: WorkspacePreset
  readonly replyTone: ReplyTone
}

export type ReviewSeverity = "high" | "medium" | "positive" | "neutral"

export type ReviewSignal = {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly severity: ReviewSeverity
}

export type ReviewPriority = "high" | "medium" | "normal"

export type KnowledgeSuggestion = {
  readonly title: string
  readonly body: string
  readonly cue: string
}

export type AuditLogEntry = {
  readonly id: string
  readonly at: string
  readonly action: AuditAction
  readonly eventIds: readonly string[]
  readonly summary: string
}
