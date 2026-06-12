import { AUDIT_ACTION_LABELS } from "../domain/labels"
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
          <div className="auditEmpty" aria-live="polite">
            <strong>감사 로그가 비어 있습니다.</strong>
            <p>상태 변경, 초안 재생성, 목업 전송 로그, 샘플 초기화가 모두 이 브라우저에만 기록됩니다.</p>
          </div>
        ) : (
          entries.slice(0, 8).map((entry) => (
            <article key={entry.id}>
              <span>{formatTrailTime(entry.at)}</span>
              <strong>{AUDIT_ACTION_LABELS[entry.action]}</strong>
              <p>{entry.summary}</p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
