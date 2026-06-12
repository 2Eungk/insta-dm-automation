import { useEffect, useMemo, useState } from "react"
import { downloadTextFile } from "../browser/download"
import { SAMPLE_SCENARIO_EVENTS, SAMPLE_SCENARIO_LABELS } from "../data/sampleScenarios"
import { analyzeEvent } from "../domain/analyze"
import { buildReviewCsvExport, buildReviewJsonExport } from "../domain/exportReview"
import { REPLY_TONE_LABELS, STATUS_LABELS } from "../domain/labels"
import { summarizeQueue, type QueueSummary } from "../domain/review"
import { buildDraftReply } from "../domain/templates"
import type {
  Classification,
  EventState,
  EventViewModel,
  ReplyTone,
  SampleScenario,
  Status,
  UserPreferences,
  WorkspacePreset,
} from "../domain/types"
import { PRESET_HINTS, buildKnowledgeSuggestions } from "../domain/workspace"
import {
  createAuditLogEntry,
  createState,
  createUserPreferences,
  loadAuditLog,
  loadOnboardingVisible,
  loadSampleScenario,
  loadStoredState,
  loadUserPreferences,
  removeAuditLogForEventIds,
  removeStoredStateForEventIds,
  saveAuditLog,
  saveOnboardingVisible,
  saveSampleScenario,
  saveStoredState,
  saveUserPreferences,
  type StoredAuditLog,
  type StoredState,
} from "../storage/persistence"

type ReviewDashboard = {
  readonly filteredEvents: readonly EventViewModel[]
  readonly selectedItem: EventViewModel | null
  readonly visibleSelectedId: string
  readonly query: string
  readonly preferences: UserPreferences
  readonly sampleScenario: SampleScenario
  readonly isOnboardingVisible: boolean
  readonly classificationFilter: Classification | "all"
  readonly statusFilter: Status | "all"
  readonly selectedBatchIds: readonly string[]
  readonly auditLog: StoredAuditLog
  readonly queueSummary: QueueSummary
  readonly quickReplies: readonly string[]
  readonly knowledgeSuggestions: ReturnType<typeof buildKnowledgeSuggestions>
  readonly sampleEventCount: number
  readonly hasActiveFilters: boolean
  readonly setQuery: (query: string) => void
  readonly setClassificationFilter: (classification: Classification | "all") => void
  readonly setStatusFilter: (status: Status | "all") => void
  readonly setSelectedId: (eventId: string) => void
  readonly setIsOnboardingVisible: (isVisible: boolean) => void
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

function createDefaultState(item: EventViewModel, replyTone: ReplyTone): EventState {
  return createState("new", buildDraftReply(item.event, item.analysis, replyTone), [])
}

function includesSearch(item: EventViewModel, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) {
    return true
  }

  return [item.event.senderName, item.event.senderHandle, item.event.message, item.state.draft]
    .join(" ")
    .toLowerCase()
    .includes(normalized)
}

function loadInitialSelectedId(): string {
  const sampleScenario = loadSampleScenario()
  return SAMPLE_SCENARIO_EVENTS[sampleScenario][0]?.id ?? ""
}

export function useReviewDashboard(): ReviewDashboard {
  const [storedState, setStoredState] = useState<StoredState>(() => loadStoredState())
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadUserPreferences())
  const [sampleScenario, setSampleScenario] = useState<SampleScenario>(() => loadSampleScenario())
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(() => loadOnboardingVisible())
  const [selectedId, setSelectedId] = useState(() => loadInitialSelectedId())
  const [query, setQuery] = useState("")
  const [classificationFilter, setClassificationFilter] = useState<Classification | "all">("all")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [selectedBatchIds, setSelectedBatchIds] = useState<readonly string[]>([])
  const [auditLog, setAuditLog] = useState<StoredAuditLog>(() => loadAuditLog())
  const sampleEvents = SAMPLE_SCENARIO_EVENTS[sampleScenario]

  const analyzedEvents = useMemo(
    () =>
      sampleEvents.map((event) => {
        const analysis = analyzeEvent(event)
        const state = storedState[event.id] ?? createState("new", buildDraftReply(event, analysis, preferences.replyTone), [])
        return { event, analysis, state }
      }),
    [preferences.replyTone, sampleEvents, storedState],
  )
  const filteredEvents = useMemo(
    () =>
      analyzedEvents.filter((item) => {
        const matchesClassification =
          classificationFilter === "all" || item.analysis.classification === classificationFilter
        const matchesStatus = statusFilter === "all" || item.state.status === statusFilter
        return matchesClassification && matchesStatus && includesSearch(item, query)
      }),
    [analyzedEvents, classificationFilter, query, statusFilter],
  )
  const visibleSelectedId = filteredEvents.some((item) => item.event.id === selectedId)
    ? selectedId
    : (filteredEvents[0]?.event.id ?? "")
  const selectedItem = filteredEvents.find((item) => item.event.id === visibleSelectedId) ?? null
  const queueSummary = useMemo(() => summarizeQueue(analyzedEvents), [analyzedEvents])
  const quickReplies = PRESET_HINTS[preferences.workspacePreset].quickReplies
  const knowledgeSuggestions =
    selectedItem === null ? [] : buildKnowledgeSuggestions(selectedItem.analysis, preferences.workspacePreset)
  const visibleEventIds = useMemo(() => filteredEvents.map((item) => item.event.id), [filteredEvents])
  const sampleEventIds = useMemo(() => sampleEvents.map((event) => event.id), [sampleEvents])
  const hasActiveFilters = query.trim().length > 0 || classificationFilter !== "all" || statusFilter !== "all"

  useEffect(() => saveStoredState(storedState), [storedState])
  useEffect(() => saveUserPreferences(preferences), [preferences])
  useEffect(() => saveAuditLog(auditLog), [auditLog])
  useEffect(() => saveSampleScenario(sampleScenario), [sampleScenario])
  useEffect(() => saveOnboardingVisible(isOnboardingVisible), [isOnboardingVisible])

  function appendAudit(action: "status-change" | "draft-regenerated" | "mock-send", eventIds: readonly string[], summary: string): void {
    setAuditLog((entries) => [createAuditLogEntry(action, eventIds, summary), ...entries].slice(0, 50))
  }

  function updateEventState(eventId: string, updater: (state: EventState) => EventState): void {
    const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
    if (item === undefined) return
    const baseState = storedState[eventId] ?? createDefaultState(item, preferences.replyTone)
    setStoredState({ ...storedState, [eventId]: updater(baseState) })
  }

  function updateWorkspacePreset(workspacePreset: WorkspacePreset): void {
    setPreferences(createUserPreferences(workspacePreset, preferences.replyTone))
  }

  function updateReplyTone(replyTone: ReplyTone): void {
    setPreferences(createUserPreferences(preferences.workspacePreset, replyTone))
  }

  function updateSelectedDraft(draft: string): void {
    if (selectedItem === null) return
    updateEventState(selectedItem.event.id, (state) => createState("drafted", draft, state.sentLog))
  }

  function updateSelectedStatus(status: Status): void {
    if (selectedItem === null) return
    updateEventState(selectedItem.event.id, (state) => createState(status, state.draft, state.sentLog))
    appendAudit("status-change", [selectedItem.event.id], `${selectedItem.event.senderName} 문의를 '${STATUS_LABELS[status]}' 상태로 변경했습니다.`)
  }

  function appendMockSendLog(): void {
    if (selectedItem === null) return
    updateEventState(selectedItem.event.id, (state) =>
      createState("approved", state.draft, [...state.sentLog, { at: new Date().toISOString(), text: state.draft }]),
    )
    appendAudit("mock-send", [selectedItem.event.id], `${selectedItem.event.senderName} 문의에 목업 전송 기록을 남겼습니다.`)
  }

  function regenerateSelectedDraft(): void {
    if (selectedItem === null) return
    updateEventState(selectedItem.event.id, (state) =>
      createState("drafted", buildDraftReply(selectedItem.event, selectedItem.analysis, preferences.replyTone), state.sentLog),
    )
    appendAudit("draft-regenerated", [selectedItem.event.id], `${selectedItem.event.senderName} 문의 초안을 '${REPLY_TONE_LABELS[preferences.replyTone]}' 톤으로 재생성했습니다.`)
  }

  function toggleBatchSelection(eventId: string): void {
    setSelectedBatchIds((ids) => (ids.includes(eventId) ? ids.filter((id) => id !== eventId) : [...ids, eventId]))
  }

  function updateSampleScenario(nextSampleScenario: SampleScenario): void {
    setSampleScenario(nextSampleScenario)
    setSelectedId(SAMPLE_SCENARIO_EVENTS[nextSampleScenario][0]?.id ?? "")
    setSelectedBatchIds([])
    setQuery("")
    setClassificationFilter("all")
    setStatusFilter("all")
  }

  function resetCurrentSampleState(): void {
    const confirmed = window.confirm("현재 샘플의 상태, 초안, 목업 전송 로그, 관련 감사 로그를 이 브라우저에서 초기화할까요?")
    if (!confirmed) return
    setStoredState((state) => removeStoredStateForEventIds(state, sampleEventIds))
    setAuditLog((entries) => [
      createAuditLogEntry("sample-reset", sampleEventIds, `${SAMPLE_SCENARIO_LABELS[sampleScenario]} 샘플의 로컬 상태를 초기화했습니다.`),
      ...removeAuditLogForEventIds(entries, sampleEventIds),
    ].slice(0, 50))
    setSelectedBatchIds([])
  }

  function updateBatchStatus(status: Status): void {
    const selectedVisibleIds = selectedBatchIds.filter((id) => visibleEventIds.includes(id))
    if (selectedVisibleIds.length === 0) return
    const nextState = selectedVisibleIds.reduce<StoredState>((stateById, eventId) => {
      const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
      if (item === undefined) return stateById
      const baseState = stateById[eventId] ?? createDefaultState(item, preferences.replyTone)
      return { ...stateById, [eventId]: createState(status, baseState.draft, baseState.sentLog) }
    }, storedState)
    setStoredState(nextState)
    setSelectedBatchIds([])
    appendAudit("status-change", selectedVisibleIds, `${selectedVisibleIds.length}개 문의를 '${STATUS_LABELS[status]}' 상태로 일괄 변경했습니다.`)
  }

  return {
    filteredEvents,
    selectedItem,
    visibleSelectedId,
    query,
    preferences,
    sampleScenario,
    isOnboardingVisible,
    classificationFilter,
    statusFilter,
    selectedBatchIds,
    auditLog,
    queueSummary,
    quickReplies,
    knowledgeSuggestions,
    sampleEventCount: sampleEvents.length,
    hasActiveFilters,
    setQuery,
    setClassificationFilter,
    setStatusFilter,
    setSelectedId,
    setIsOnboardingVisible,
    updateWorkspacePreset,
    updateReplyTone,
    updateSelectedDraft,
    updateSelectedStatus,
    appendMockSendLog,
    regenerateSelectedDraft,
    toggleBatchSelection,
    selectAllVisible: () => setSelectedBatchIds(visibleEventIds),
    clearBatchSelection: () => setSelectedBatchIds([]),
    updateSampleScenario,
    resetCurrentSampleState,
    exportReviewJson: () => downloadTextFile(`local-review-${sampleScenario}.json`, buildReviewJsonExport(analyzedEvents, auditLog, sampleScenario), "application/json;charset=utf-8"),
    exportReviewCsv: () => downloadTextFile(`local-review-${sampleScenario}.csv`, buildReviewCsvExport(analyzedEvents, auditLog), "text/csv;charset=utf-8"),
    updateBatchStatus,
  }
}
