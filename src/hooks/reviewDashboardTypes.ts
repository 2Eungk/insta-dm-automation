import type { FilterPresetId } from "../domain/filterPresets"
import type { LocalAnalytics } from "../domain/analytics"
import type { QueueSummary } from "../domain/review"
import type {
  Classification,
  EventViewModel,
  ReplyTone,
  SampleScenario,
  Status,
  UserPreferences,
  WorkspacePreset,
} from "../domain/types"
import type { buildKnowledgeSuggestions } from "../domain/workspace"
import type { StoredAuditLog } from "../storage/persistence"

export type ReviewDashboard = {
  readonly filteredEvents: readonly EventViewModel[]
  readonly selectedItem: EventViewModel | null
  readonly visibleSelectedId: string
  readonly query: string
  readonly preferences: UserPreferences
  readonly sampleScenario: SampleScenario
  readonly isOnboardingVisible: boolean
  readonly classificationFilter: Classification | "all"
  readonly statusFilter: Status | "all"
  readonly activeFilterPresetId: FilterPresetId
  readonly selectedBatchIds: readonly string[]
  readonly auditLog: StoredAuditLog
  readonly queueSummary: QueueSummary
  readonly localAnalytics: LocalAnalytics
  readonly quickReplies: readonly string[]
  readonly knowledgeSuggestions: ReturnType<typeof buildKnowledgeSuggestions>
  readonly sampleEventCount: number
  readonly hasActiveFilters: boolean
  readonly setQuery: (query: string) => void
  readonly setClassificationFilter: (classification: Classification | "all") => void
  readonly setStatusFilter: (status: Status | "all") => void
  readonly setSelectedId: (eventId: string) => void
  readonly setIsOnboardingVisible: (isVisible: boolean) => void
  readonly applyFilterPreset: (filterPresetId: FilterPresetId) => void
  readonly updateWorkspacePreset: (workspacePreset: WorkspacePreset) => void
  readonly updateReplyTone: (replyTone: ReplyTone) => void
  readonly updateSelectedDraft: (draft: string) => void
  readonly updateSelectedStatus: (status: Status) => void
  readonly appendMockSendLog: () => void
  readonly regenerateSelectedDraft: () => void
  readonly toggleBatchSelection: (eventId: string) => void
  readonly selectAllVisible: () => void
  readonly clearBatchSelection: () => void
  readonly updateSampleScenario: (sampleScenario: SampleScenario) => void
  readonly resetCurrentSampleState: () => void
  readonly exportReviewJson: () => void
  readonly exportReviewCsv: () => void
  readonly updateBatchStatus: (status: Status) => void
}
