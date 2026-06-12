import { useEffect, useMemo, useState } from "react"
import { downloadTextFile } from "../browser/download"
import { SAMPLE_SCENARIO_EVENTS, SAMPLE_SCENARIO_LABELS } from "../data/sampleScenarios"
import { analyzeEvent } from "../domain/analyze"
import { buildLocalAnalytics } from "../domain/analytics"
import { buildReviewCsvExport, buildReviewJsonExport } from "../domain/exportReview"
import { filterReviewEvents } from "../domain/filters"
import type { FilterPresetId } from "../domain/filterPresets"
import { REPLY_TONE_LABELS, STATUS_LABELS } from "../domain/labels"
import { DEFAULT_RULE_CONFIG, DEFAULT_TEMPLATE_CONFIG, type RuleConfig, type TemplateConfig } from "../domain/localConfig"
import { summarizeQueue } from "../domain/review"
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
import type { ReviewDashboard } from "./reviewDashboardTypes"
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

const AUDIT_LOG_LIMIT = 50

function createDefaultState(item: EventViewModel, replyTone: ReplyTone, templateConfig: TemplateConfig): EventState {
  return createState("new", buildDraftReply(item.event, item.analysis, replyTone, templateConfig), [])
}

function loadInitialSelectedId(): string {
  const sampleScenario = loadSampleScenario()
  return SAMPLE_SCENARIO_EVENTS[sampleScenario][0]?.id ?? ""
}

export function useReviewDashboard(
  ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG,
  templateConfig: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
): ReviewDashboard {
  const [storedState, setStoredState] = useState<StoredState>(() => loadStoredState())
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadUserPreferences())
  const [sampleScenario, setSampleScenario] = useState<SampleScenario>(() => loadSampleScenario())
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(() => loadOnboardingVisible())
  const [selectedId, setSelectedId] = useState(() => loadInitialSelectedId())
  const [query, setQuery] = useState("")
  const [classificationFilter, setClassificationFilter] = useState<Classification | "all">("all")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [activeFilterPresetId, setActiveFilterPresetId] = useState<FilterPresetId>("all")
  const [selectedBatchIds, setSelectedBatchIds] = useState<readonly string[]>([])
  const [auditLog, setAuditLog] = useState<StoredAuditLog>(() => loadAuditLog())
  const sampleEvents = SAMPLE_SCENARIO_EVENTS[sampleScenario]

  const analyzedEvents = useMemo(
    () =>
      sampleEvents.map((event) => {
        const analysis = analyzeEvent(event, ruleConfig)
        const state = storedState[event.id] ?? createState("new", buildDraftReply(event, analysis, preferences.replyTone, templateConfig), [])
        return { event, analysis, state }
      }),
    [preferences.replyTone, ruleConfig, sampleEvents, storedState, templateConfig],
  )
  const filteredEvents = useMemo(
    () =>
      filterReviewEvents(analyzedEvents, {
        query,
        classification: classificationFilter,
        status: statusFilter,
        filterPresetId: activeFilterPresetId,
      }),
    [activeFilterPresetId, analyzedEvents, classificationFilter, query, statusFilter],
  )
  const visibleSelectedId = filteredEvents.some((item) => item.event.id === selectedId)
    ? selectedId
    : (filteredEvents[0]?.event.id ?? "")
  const selectedItem = filteredEvents.find((item) => item.event.id === visibleSelectedId) ?? null
  const queueSummary = useMemo(() => summarizeQueue(analyzedEvents), [analyzedEvents])
  const localAnalytics = useMemo(() => buildLocalAnalytics(filteredEvents), [filteredEvents])
  const quickReplies = PRESET_HINTS[preferences.workspacePreset].quickReplies
  const knowledgeSuggestions =
    selectedItem === null ? [] : buildKnowledgeSuggestions(selectedItem.analysis, preferences.workspacePreset)
  const visibleEventIds = useMemo(() => filteredEvents.map((item) => item.event.id), [filteredEvents])
  const sampleEventIds = useMemo(() => sampleEvents.map((event) => event.id), [sampleEvents])
  const hasActiveFilters =
    query.trim().length > 0 ||
    classificationFilter !== "all" ||
    statusFilter !== "all" ||
    activeFilterPresetId !== "all"

  useEffect(() => saveStoredState(storedState), [storedState])
  useEffect(() => saveUserPreferences(preferences), [preferences])
  useEffect(() => saveAuditLog(auditLog), [auditLog])
  useEffect(() => saveSampleScenario(sampleScenario), [sampleScenario])
  useEffect(() => saveOnboardingVisible(isOnboardingVisible), [isOnboardingVisible])

  function appendAudit(action: "status-change" | "draft-regenerated" | "mock-send", eventIds: readonly string[], summary: string): void {
    setAuditLog((entries) => [createAuditLogEntry(action, eventIds, summary), ...entries].slice(0, AUDIT_LOG_LIMIT))
  }

  function updateEventState(eventId: string, updater: (state: EventState) => EventState): void {
    const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
    if (item === undefined) return
    const baseState = storedState[eventId] ?? createDefaultState(item, preferences.replyTone, templateConfig)
    setStoredState({ ...storedState, [eventId]: updater(baseState) })
  }

  function updateWorkspacePreset(workspacePreset: WorkspacePreset): void {
    setPreferences(createUserPreferences(workspacePreset, preferences.replyTone))
  }

  function updateReplyTone(replyTone: ReplyTone): void {
    setPreferences(createUserPreferences(preferences.workspacePreset, replyTone))
  }

  function updateClassificationFilter(classification: Classification | "all"): void {
    setActiveFilterPresetId("all")
    setClassificationFilter(classification)
  }

  function updateStatusFilter(status: Status | "all"): void {
    setActiveFilterPresetId("all")
    setStatusFilter(status)
  }

  function applyFilterPreset(filterPresetId: FilterPresetId): void {
    setActiveFilterPresetId(filterPresetId)
    setClassificationFilter("all")
    setStatusFilter("all")
    setQuery("")
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
      createState("drafted", buildDraftReply(selectedItem.event, selectedItem.analysis, preferences.replyTone, templateConfig), state.sentLog),
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
    setActiveFilterPresetId("all")
  }

  function resetCurrentSampleState(): void {
    const confirmed = window.confirm("현재 샘플의 상태, 초안, 목업 전송 로그, 관련 감사 로그를 이 브라우저에서 초기화할까요?")
    if (!confirmed) return
    setStoredState((state) => removeStoredStateForEventIds(state, sampleEventIds))
    setAuditLog((entries) => [
      createAuditLogEntry("sample-reset", sampleEventIds, `${SAMPLE_SCENARIO_LABELS[sampleScenario]} 샘플의 로컬 상태를 초기화했습니다.`),
      ...removeAuditLogForEventIds(entries, sampleEventIds),
    ].slice(0, AUDIT_LOG_LIMIT))
    setSelectedBatchIds([])
  }

  function updateBatchStatus(status: Status): void {
    const selectedVisibleIds = selectedBatchIds.filter((id) => visibleEventIds.includes(id))
    if (selectedVisibleIds.length === 0) return
    const nextState = selectedVisibleIds.reduce<StoredState>((stateById, eventId) => {
      const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
      if (item === undefined) return stateById
      const baseState = stateById[eventId] ?? createDefaultState(item, preferences.replyTone, templateConfig)
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
    activeFilterPresetId,
    selectedBatchIds,
    auditLog,
    queueSummary,
    localAnalytics,
    quickReplies,
    knowledgeSuggestions,
    sampleEventCount: sampleEvents.length,
    hasActiveFilters,
    setQuery,
    setClassificationFilter: updateClassificationFilter,
    setStatusFilter: updateStatusFilter,
    setSelectedId,
    setIsOnboardingVisible,
    applyFilterPreset,
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
