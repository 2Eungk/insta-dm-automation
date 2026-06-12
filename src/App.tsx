import { useEffect, useMemo, useState } from "react"
import { DetailPanel } from "./components/DetailPanel"
import { InboxList } from "./components/InboxList"
import { Toolbar } from "./components/Toolbar"
import { MOCK_EVENTS } from "./data/mockEvents"
import { analyzeEvent } from "./domain/analyze"
import { buildDraftReply } from "./domain/templates"
import type { Classification, EventState, EventViewModel, Status } from "./domain/types"
import { createState, loadStoredState, saveStoredState, type StoredState } from "./storage/persistence"

function createDefaultState(item: EventViewModel): EventState {
  return createState("new", buildDraftReply(item.event, item.analysis), [])
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
  const [selectedId, setSelectedId] = useState(MOCK_EVENTS[0]?.id ?? "")
  const [query, setQuery] = useState("")
  const [classificationFilter, setClassificationFilter] = useState<Classification | "all">("all")
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all")

  const analyzedEvents = useMemo(
    () =>
      MOCK_EVENTS.map((event) => {
        const analysis = analyzeEvent(event)
        const state = storedState[event.id] ?? createState("new", buildDraftReply(event, analysis), [])
        return { event, analysis, state }
      }),
    [storedState],
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

  useEffect(() => {
    saveStoredState(storedState)
  }, [storedState])

  function updateEventState(eventId: string, updater: (state: EventState) => EventState): void {
    const item = analyzedEvents.find((candidate) => candidate.event.id === eventId)
    if (item === undefined) {
      return
    }

    const baseState = storedState[eventId] ?? createDefaultState(item)
    setStoredState({ ...storedState, [eventId]: updater(baseState) })
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
        classificationFilter={classificationFilter}
        statusFilter={statusFilter}
        onQueryChange={setQuery}
        onClassificationChange={setClassificationFilter}
        onStatusChange={setStatusFilter}
      />

      <section className="workspace">
        <InboxList events={filteredEvents} selectedId={visibleSelectedId} onSelect={setSelectedId} />
        {selectedItem === null ? (
          <section className="detail emptyState">표시할 문의가 없습니다.</section>
        ) : (
          <DetailPanel
            item={selectedItem}
            onDraftChange={updateSelectedDraft}
            onStatusChange={updateSelectedStatus}
            onMockSend={appendMockSendLog}
          />
        )}
      </section>
    </main>
  )
}
