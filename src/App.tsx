import { useEffect, useMemo, useState } from "react"
import { DetailPanel } from "./components/DetailPanel"
import { InboxList } from "./components/InboxList"
import { Toolbar } from "./components/Toolbar"
import { MOCK_EVENTS } from "./data/mockEvents"
import { analyzeEvent } from "./domain/analyze"
import { summarizeQueue } from "./domain/review"
import { buildDraftReply } from "./domain/templates"
import type { Classification, EventState, EventViewModel, ReplyTone, Status, UserPreferences, WorkspacePreset } from "./domain/types"
import { PRESET_HINTS, buildKnowledgeSuggestions } from "./domain/workspace"
import {
  createState,
  createUserPreferences,
  loadStoredState,
  loadUserPreferences,
  saveStoredState,
  saveUserPreferences,
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

  useEffect(() => {
    saveStoredState(storedState)
  }, [storedState])

  useEffect(() => {
    saveUserPreferences(preferences)
  }, [preferences])

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
  }

  function appendMockSendLog(): void {
    if (selectedItem === null) {
      return
    }

    updateEventState(selectedItem.event.id, (state) =>
      createState("approved", state.draft, [...state.sentLog, { at: new Date().toISOString(), text: state.draft }]),
    )
  }

  function regenerateSelectedDraft(): void {
    if (selectedItem === null) {
      return
    }

    updateEventState(selectedItem.event.id, (state) =>
      createState("drafted", buildDraftReply(selectedItem.event, selectedItem.analysis, preferences.replyTone), state.sentLog),
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

      <section className="workspace">
        <InboxList events={filteredEvents} selectedId={visibleSelectedId} onSelect={setSelectedId} />
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

type SummaryCardProps = {
  readonly label: string
  readonly value: number
  readonly detail: string
  readonly tone?: "alert" | "positive"
}

function SummaryCard({ label, value, detail, tone }: SummaryCardProps): React.JSX.Element {
  const className = tone === undefined ? "summaryCard" : `summaryCard ${tone}`
  return (
    <article className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}
