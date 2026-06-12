import { CLASSIFICATION_LABELS, STATUS_LABELS } from "../domain/labels"
import { getReviewPriority, getReviewSignals } from "../domain/review"
import type { EventViewModel } from "../domain/types"

type InboxListProps = {
  readonly events: readonly EventViewModel[]
  readonly selectedId: string
  readonly onSelect: (id: string) => void
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function InboxList({ events, selectedId, onSelect }: InboxListProps): React.JSX.Element {
  return (
    <section className="inbox" aria-label="인박스 목록">
      <div className="panelHeader">
        <p>Inbox</p>
        <strong>{events.length}</strong>
      </div>
      <div className="inboxList">
        {events.map((item) => {
          const priority = getReviewPriority(item)
          const signalCount = getReviewSignals(item).length
          return (
            <button
              type="button"
              key={item.event.id}
              className={item.event.id === selectedId ? "inboxItem active" : "inboxItem"}
              onClick={() => onSelect(item.event.id)}
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
          )
        })}
      </div>
    </section>
  )
}
