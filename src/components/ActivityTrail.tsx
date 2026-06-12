import type { AuditLogEntry } from "../domain/types"

type ActivityTrailProps = {
  readonly entries: readonly AuditLogEntry[]
}

function formatTrailTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function actionLabel(action: AuditLogEntry["action"]): string {
  switch (action) {
    case "status-change":
      return "상태 변경"
    case "draft-regenerated":
      return "초안 재생성"
    case "mock-send":
      return "목업 기록"
  }
}

export function ActivityTrail({ entries }: ActivityTrailProps): React.JSX.Element {
  return (
    <section className="activityPanel" aria-label="활동 및 감사 로그">
      <header className="panelHeader compact">
        <div>
          <p>Audit Trail</p>
          <strong>로컬 활동 로그</strong>
        </div>
        <span>{entries.length}</span>
      </header>
      <div className="activityList">
        {entries.length === 0 ? (
          <p>아직 기록된 로컬 액션이 없습니다.</p>
        ) : (
          entries.slice(0, 8).map((entry) => (
            <article key={entry.id}>
              <span>{formatTrailTime(entry.at)}</span>
              <strong>{actionLabel(entry.action)}</strong>
              <p>{entry.summary}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
