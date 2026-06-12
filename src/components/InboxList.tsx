import { CLASSIFICATION_LABELS, STATUS_LABELS } from "../domain/labels"
import { getReviewPriority, getReviewSignals } from "../domain/review"
import type { EventViewModel, Status } from "../domain/types"
import { EmptyState } from "./EmptyState"

type InboxListProps = {
  readonly events: readonly EventViewModel[]
  readonly selectedId: string
  readonly selectedBatchIds: readonly string[]
  readonly onSelect: (id: string) => void
  readonly onToggleBatch: (id: string) => void
  readonly onSelectAllVisible: () => void
  readonly onClearBatch: () => void
  readonly onBatchStatusChange: (status: Status) => void
  readonly emptyTitle: string
  readonly emptyBody: string
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function InboxList({
  events,
  selectedId,
  selectedBatchIds,
  onSelect,
  onToggleBatch,
  onSelectAllVisible,
  onClearBatch,
  onBatchStatusChange,
  emptyTitle,
  emptyBody,
}: InboxListProps): React.JSX.Element {
  const selectedBatch = new Set(selectedBatchIds)
  const selectedCount = selectedBatchIds.length

  return (
    <section className="inbox" aria-label="인박스 목록">
      <div className="panelHeader">
        <div>
          <p>Inbox</p>
          <strong>{events.length}</strong>
        </div>
        <span>{selectedCount} selected</span>
      </div>
      <div className="batchBar" aria-label="선택 항목 일괄 상태 변경">
        <button type="button" disabled={events.length === 0} onClick={onSelectAllVisible} aria-label="보이는 문의 전체 선택">전체 선택</button>
        <button type="button" disabled={selectedCount === 0} onClick={onClearBatch} aria-label="일괄 선택 해제">해제</button>
        <button type="button" disabled={selectedCount === 0} onClick={() => onBatchStatusChange("hold")} aria-label="선택 문의 보류 처리">보류</button>
        <button type="button" disabled={selectedCount === 0} onClick={() => onBatchStatusChange("ignored")} aria-label="선택 문의 무시 처리">무시</button>
        <button type="button" disabled={selectedCount === 0} onClick={() => onBatchStatusChange("approved")} aria-label="선택 문의 승인 처리">승인</button>
      </div>
      <div className="inboxList">
        {events.length === 0 ? (
          <EmptyState title={emptyTitle} body={emptyBody} />
        ) : events.map((item) => {
          const priority = getReviewPriority(item)
          const signalCount = getReviewSignals(item).length
          const isChecked = selectedBatch.has(item.event.id)
          return (
            <article
              key={item.event.id}
              className={item.event.id === selectedId ? "inboxItem active" : "inboxItem"}
            >
              <label className="batchCheck">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleBatch(item.event.id)}
                  aria-label={`${item.event.senderName} 선택`}
                />
              </label>
              <button
                type="button"
                className="inboxSelectButton"
                onClick={() => onSelect(item.event.id)}
                aria-pressed={item.event.id === selectedId}
                aria-label={`${item.event.senderName} 문의 상세 보기`}
              >
                <span className="itemTopline">
                  <strong>{item.event.senderName}</strong>
                  <span>{formatTime(item.event.receivedAt)}</span>
                </span>
                <span className="handle">{item.event.senderHandle}</span>
                <span className="messagePreview">{item.event.message}</span>
                <span className="itemMeta">
                  <span className={`priorityPill priority-${priority}`}>
                    {priority === "high" ? "High" : priority === "medium" ? "Review" : "Normal"}
                  </span>
                  <span className={`badge badge-${item.analysis.classification}`}>
                    {CLASSIFICATION_LABELS[item.analysis.classification]}
                  </span>
                  <span className={`statusDot status-${item.state.status}`}>
                    {STATUS_LABELS[item.state.status]}
                  </span>
                  <span className="signalCount">{signalCount} signals</span>
                </span>
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
