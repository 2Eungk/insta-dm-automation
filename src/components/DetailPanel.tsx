import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS, STATUS_LABELS } from "../domain/labels"
import type { EventViewModel, Status } from "../domain/types"

type DetailPanelProps = {
  readonly item: EventViewModel
  readonly onDraftChange: (draft: string) => void
  readonly onStatusChange: (status: Status) => void
  readonly onMockSend: () => void
}

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function fieldValue(value: string | null): string {
  return value ?? "미정"
}

export function DetailPanel({
  item,
  onDraftChange,
  onStatusChange,
  onMockSend,
}: DetailPanelProps): React.JSX.Element {
  const fields = item.analysis.fields

  return (
    <section className="detail" aria-label="문의 상세">
      <header className="detailHeader">
        <div>
          <p className="eyebrow">{item.event.channel === "dm" ? "Instagram DM" : "Instagram 댓글"}</p>
          <h2>{item.event.senderName}</h2>
          <span>{item.event.senderHandle} · {formatFullDate(item.event.receivedAt)}</span>
        </div>
        <div className="detailBadges">
          <span className={`badge badge-${item.analysis.classification}`}>
            {CLASSIFICATION_LABELS[item.analysis.classification]}
          </span>
          <span className={`statusDot status-${item.state.status}`}>
            {STATUS_LABELS[item.state.status]}
          </span>
        </div>
      </header>

      <div className="messageBlock">
        <p>{item.event.message}</p>
      </div>

      <div className="fieldGrid" aria-label="추출 정보">
        <InfoTile label="촬영종류" value={fieldValue(fields.shootType)} />
        <InfoTile label="지역" value={fieldValue(fields.location)} />
        <InfoTile label="희망일" value={fieldValue(fields.preferredDate)} />
        <InfoTile label="예산" value={fieldValue(fields.budget)} />
        <InfoTile label="연락처" value={fieldValue(fields.contact)} />
        <InfoTile label="신뢰도" value={`${Math.round(item.analysis.confidence * 100)}%`} />
      </div>

      <div className="missingBox">
        <span>누락정보</span>
        <div>
          {fields.missing.length === 0 ? (
            <strong>필수 정보 확인됨</strong>
          ) : (
            fields.missing.map((field) => <strong key={field}>{MISSING_FIELD_LABELS[field]}</strong>)
          )}
        </div>
      </div>

      <label className="draftEditor">
        <span>한국어 답장 초안</span>
        <textarea value={item.state.draft} onChange={(event) => onDraftChange(event.target.value)} />
      </label>

      <div className="actionBar" aria-label="상태 워크플로">
        <button type="button" onClick={() => onStatusChange("drafted")}>초안 저장</button>
        <button type="button" className="primary" onClick={() => onStatusChange("approved")}>승인</button>
        <button type="button" onClick={() => onStatusChange("hold")}>보류</button>
        <button type="button" onClick={() => onStatusChange("ignored")}>무시</button>
        <button type="button" className="sendMock" onClick={onMockSend}>목업 전송 로그</button>
      </div>

      <div className="sendLog">
        <span>전송 로그</span>
        {item.state.sentLog.length === 0 ? (
          <p>아직 전송 기록이 없습니다. 실제 Instagram/Meta 전송은 연결되어 있지 않습니다.</p>
        ) : (
          item.state.sentLog.map((entry) => (
            <p key={`${entry.at}-${entry.text.slice(0, 12)}`}>{formatFullDate(entry.at)} · 목업 기록</p>
          ))
        )}
      </div>
    </section>
  )
}

type InfoTileProps = {
  readonly label: string
  readonly value: string
}

function InfoTile({ label, value }: InfoTileProps): React.JSX.Element {
  return (
    <div className="infoTile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
