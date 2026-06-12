import { useEffect, useMemo, useState } from "react"
import { ActivityTrail } from "./components/ActivityTrail"
import { DetailPanel } from "./components/DetailPanel"
import { InboxList } from "./components/InboxList"
import { RulesPreviewPanel } from "./components/RulesPreviewPanel"
import { SummaryCard } from "./components/SummaryCard"
import { Toolbar } from "./components/Toolbar"
import { MOCK_EVENTS } from "./data/mockEvents"
import { analyzeEvent } from "./domain/analyze"
import { REPLY_TONE_LABELS, STATUS_LABELS } from "./domain/labels"
import { summarizeQueue } from "./domain/review"
import { buildDraftReply } from "./domain/templates"
import type { Classification, EventState, EventViewModel, ReplyTone, Status, UserPreferences, WorkspacePreset } from "./domain/types"
import { PRESET_HINTS, buildKnowledgeSuggestions } from "./domain/workspace"
import {
  createState,
  createAuditLogEntry,
  createUserPreferences,
  loadAuditLog,
  loadStoredState,
  loadUserPreferences,
  saveAuditLog,
  saveStoredState,
  saveUserPreferences,
  type StoredAuditLog,
  type StoredState,
} from "./storage/persistence"

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

export function App(): React.JSX.Element {
  const [storedState, setStoredState] = useState<StoredState>(() => loadStoredState())
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadUserPreferences())
  const [selectedId, setSelectedId] = useState(MOCK_EVENTS[0]?.id ?? "")
  const [query, setQuery] = useState("")
  const [classificationFilter, setClassificationFilter] = useState<Classification | "all">("all")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")
  const [selectedBatchIds, setSelectedBatchIds] = useState<readonly string[]>([])
  const [auditLog, setAuditLog] = useState<StoredAuditLog>(() => loadAuditLog())

  const analyzedEvents = useMemo(
    () =>
      MOCK_EVENTS.map((event) => {
        const analysis = analyzeEvent(event)
        const state = storedState[event.id] ?? createState("new", buildDraftReply(event, analysis, preferences.replyTone), [])
        return { event, analysis, state }
      }),
    [preferences.replyTone, storedState],
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

  useEffect(() => {
    saveStoredState(storedState)
  }, [storedState])

  useEffect(() => {
    saveUserPreferences(preferences)
  }, [preferences])

  useEffect(() => {
    saveAuditLog(auditLog)
  }, [auditLog])

  function appendAudit(
    action: "status-change" | "draft-regenerated" | "mock-send",
    eventIds: readonly string[],
    summary: string,
  ): void {
    setAuditLog((entries) => [createAuditLogEntry(action, eventIds, summary), ...entries].slice(0, 50))
  }

  function updateEventState(eventId: string, updater: (state: EventState) => EventState): void {
    const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
    if (item === undefined) {
      return
    }

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
    if (selectedItem === null) {
      return
    }

    updateEventState(selectedItem.event.id, (state) => createState("drafted", draft, state.sentLog))
  }

  function updateSelectedStatus(status: Status): void {
    if (selectedItem === null) {
      return
    }

    updateEventState(selectedItem.event.id, (state) => createState(status, state.draft, state.sentLog))
    appendAudit(
      "status-change",
      [selectedItem.event.id],
      `${selectedItem.event.senderName} 문의를 '${STATUS_LABELS[status]}' 상태로 변경했습니다.`,
    )
  }

  function appendMockSendLog(): void {
    if (selectedItem === null) {
      return
    }

    updateEventState(selectedItem.event.id, (state) =>
      createState("approved", state.draft, [...state.sentLog, { at: new Date().toISOString(), text: state.draft }]),
    )
    appendAudit("mock-send", [selectedItem.event.id], `${selectedItem.event.senderName} 문의에 목업 전송 기록을 남겼습니다.`)
  }

  function regenerateSelectedDraft(): void {
    if (selectedItem === null) {
      return
    }

    updateEventState(selectedItem.event.id, (state) =>
      createState("drafted", buildDraftReply(selectedItem.event, selectedItem.analysis, preferences.replyTone), state.sentLog),
    )
    appendAudit(
      "draft-regenerated",
      [selectedItem.event.id],
      `${selectedItem.event.senderName} 문의 초안을 '${REPLY_TONE_LABELS[preferences.replyTone]}' 톤으로 재생성했습니다.`,
    )
  }

  function toggleBatchSelection(eventId: string): void {
    setSelectedBatchIds((ids) => (ids.includes(eventId) ? ids.filter((id) => id !== eventId) : [...ids, eventId]))
  }

  function selectAllVisible(): void {
    setSelectedBatchIds(visibleEventIds)
  }

  function clearBatchSelection(): void {
    setSelectedBatchIds([])
  }

  function updateBatchStatus(status: Status): void {
    const selectedVisibleIds = selectedBatchIds.filter((id) => visibleEventIds.includes(id))
    if (selectedVisibleIds.length === 0) {
      return
    }

    const nextState: StoredState = selectedVisibleIds.reduce((stateById, eventId) => {
      const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
      if (item === undefined) {
        return stateById
      }

      const baseState = stateById[eventId] ?? createDefaultState(item, preferences.replyTone)
      return { ...stateById, [eventId]: createState(status, baseState.draft, baseState.sentLog) }
    }, storedState)

    setStoredState(nextState)
    setSelectedBatchIds([])
    appendAudit(
      "status-change",
      selectedVisibleIds,
      `${selectedVisibleIds.length}개 문의를 '${STATUS_LABELS[status]}' 상태로 일괄 변경했습니다.`,
    )
  }

  return (
    <main className="appShell">
      <header className="hero">
        <div>
          <p className="eyebrow">Social Inbox Review Desk</p>
          <h1>Instagram DM·댓글 자동 검토 보드</h1>
          <p>
            작은 비즈니스와 크리에이터가 DM과 댓글을 분류하고, 누락 정보를 확인한 뒤 사람이 최종 승인하는
            답장 초안 워크플로입니다.
          </p>
        </div>
        <aside className="connectionNotice">
          <strong>Meta 전송 미연결</strong>
          <span>실제 Instagram/Meta API, 토큰, 백엔드, 자동 발송은 포함하지 않습니다.</span>
        </aside>
      </header>

      <Toolbar
        query={query}
        workspacePreset={preferences.workspacePreset}
        replyTone={preferences.replyTone}
        quickReplies={quickReplies}
        classificationFilter={classificationFilter}
        statusFilter={statusFilter}
        onQueryChange={setQuery}
        onWorkspacePresetChange={updateWorkspacePreset}
        onReplyToneChange={updateReplyTone}
        onClassificationChange={setClassificationFilter}
        onStatusChange={setStatusFilter}
      />

      <section className="summaryGrid" aria-label="승인 큐 요약">
        <SummaryCard label="신규" value={queueSummary.newCount} detail="아직 처리 전" />
        <SummaryCard label="정보 필요" value={queueSummary.needsInfoCount} detail="누락 필드 있음" />
        <SummaryCard label="높은 우선순위" value={queueSummary.highPriorityCount} detail="긴급/스팸 신호" tone="alert" />
        <SummaryCard label="승인됨" value={queueSummary.approvedCount} detail="목업 승인 완료" tone="positive" />
      </section>

      <section className="operatorDeck" aria-label="운영자 컨트롤과 감사 로그">
        <RulesPreviewPanel />
        <ActivityTrail entries={auditLog} />
      </section>

      <section className="workspace">
        <InboxList
          events={filteredEvents}
          selectedId={visibleSelectedId}
          selectedBatchIds={selectedBatchIds}
          onSelect={setSelectedId}
          onToggleBatch={toggleBatchSelection}
          onSelectAllVisible={selectAllVisible}
          onClearBatch={clearBatchSelection}
          onBatchStatusChange={updateBatchStatus}
        />
        {selectedItem === null ? (
          <section className="detail emptyState">표시할 문의가 없습니다.</section>
        ) : (
          <DetailPanel
            item={selectedItem}
            knowledgeSuggestions={knowledgeSuggestions}
            onDraftChange={updateSelectedDraft}
            onStatusChange={updateSelectedStatus}
            onRegenerateDraft={regenerateSelectedDraft}
            onMockSend={appendMockSendLog}
          />
        )}
      </section>
    </main>
  )
}
