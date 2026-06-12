import { CLASSIFICATION_LABELS, STATUS_LABELS } from "../domain/labels"
import { CLASSIFICATIONS, STATUSES, type Classification, type Status } from "../domain/types"

type ToolbarProps = {
  readonly query: string
  readonly classificationFilter: Classification | "all"
  readonly statusFilter: Status | "all"
  readonly onQueryChange: (query: string) => void
  readonly onClassificationChange: (classification: Classification | "all") => void
  readonly onStatusChange: (status: Status | "all") => void
}

function parseClassificationFilter(value: string): Classification | "all" {
  if (value === "all") {
    return "all"
  }

  return CLASSIFICATIONS.find((classification) => classification === value) ?? "all"
}

function parseStatusFilter(value: string): Status | "all" {
  if (value === "all") {
    return "all"
  }

  return STATUSES.find((status) => status === value) ?? "all"
}

export function Toolbar({
  query,
  classificationFilter,
  statusFilter,
  onQueryChange,
  onClassificationChange,
  onStatusChange,
}: ToolbarProps): React.JSX.Element {
  return (
    <section className="toolbar" aria-label="필터와 검색">
      <label className="searchBox">
        <span>검색</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="이름, 핸들, 메시지 검색"
        />
      </label>
      <label>
        <span>분류</span>
        <select
          value={classificationFilter}
          onChange={(event) => onClassificationChange(parseClassificationFilter(event.target.value))}
        >
          <option value="all">전체 분류</option>
          {CLASSIFICATIONS.map((classification) => (
            <option key={classification} value={classification}>
              {CLASSIFICATION_LABELS[classification]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>상태</span>
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(parseStatusFilter(event.target.value))}
        >
          <option value="all">전체 상태</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
