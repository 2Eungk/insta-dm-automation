import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS, STATUS_LABELS } from "../domain/labels"
import { getReviewPriority, getReviewSignals } from "../domain/review"
import type { EventViewModel, KnowledgeSuggestion, Status } from "../domain/types"
import { QualityChecklist } from "./QualityChecklist"

type DetailPanelProps = {
  readonly item: EventViewModel
  readonly knowledgeSuggestions: readonly KnowledgeSuggestion[]
  readonly onDraftChange: (draft: string) => void
  readonly onStatusChange: (status: Status) => void
  readonly onRegenerateDraft: () => void
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
  knowledgeSuggestions,
  onDraftChange,
  onStatusChange,
  onRegenerateDraft,
  onMockSend,
}: DetailPanelProps): React.JSX.Element {
  const fields = item.analysis.fields
  const reviewSignals = getReviewSignals(item)
  const reviewPriority = getReviewPriority(item)

  return (
    <section className="detail" aria-label="문의 상세">
      <header className="detailHeader">
        <div>
          <p className="eyebrow">{item.event.channel === "dm" ? "Instagram DM" : "Instagram 댓글"}</p>
          <h2>{item.event.senderName}</h2>
          <span>{item.event.senderHandle} · {formatFullDate(item.event.receivedAt)}</span>
        </div>
        <div className="detailBadges">
          <span className={`priorityPill priority-${reviewPriority}`}>
            {reviewPriority === "high" ? "High priority" : reviewPriority === "medium" ? "Needs review" : "Normal"}
          </span>
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
        <InfoTile label="의도/주제" value={fieldValue(fields.topic)} />
        <InfoTile label="상품/서비스" value={fieldValue(fields.productOrService)} />
        <InfoTile label="지역/채널" value={fieldValue(fields.locationOrChannel)} />
        <InfoTile label="요청 일시" value={fieldValue(fields.requestedDateTime)} />
        <InfoTile label="예산/가격" value={fieldValue(fields.budgetOrPrice)} />
        <InfoTile label="연락처" value={fieldValue(fields.contact)} />
        <InfoTile label="주문/예약번호" value={fieldValue(fields.orderOrReservationRef)} />
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

      <section className="reviewIntel" aria-label="리뷰 인텔리전스">
        <header>
          <span>리스크/우선순위</span>
          <strong>{reviewSignals.length}개 신호</strong>
        </header>
        <div className="signalGrid">
          {reviewSignals.map((signal) => (
            <article key={signal.id} className={`signalCard signal-${signal.severity}`}>
              <strong>{signal.label}</strong>
              <p>{signal.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <QualityChecklist item={item} />

      <section className="knowledgeBox" aria-label="FAQ 및 지식 매칭">
        <header>
          <span>FAQ/지식 매칭</span>
          <strong>{CLASSIFICATION_LABELS[item.analysis.classification]}</strong>
        </header>
        <div className="knowledgeList">
          {knowledgeSuggestions.map((suggestion) => (
            <article key={`${suggestion.title}-${suggestion.cue}`}>
              <span>{suggestion.cue}</span>
              <strong>{suggestion.title}</strong>
              <p>{suggestion.body}</p>
            </article>
          ))}
        </div>
      </section>

      <label className="draftEditor">
        <span>한국어 답장 초안</span>
        <textarea
          value={item.state.draft}
          onChange={(event) => onDraftChange(event.target.value)}
          aria-label={`${item.event.senderName} 답장 초안 편집`}
        />
      </label>

      <div className="actionBar" aria-label="상태 워크플로">
        <button type="button" onClick={onRegenerateDraft} aria-label="선택한 답장 톤으로 초안 재생성">선택 톤으로 재생성</button>
        <button type="button" onClick={() => onStatusChange("drafted")} aria-label="현재 초안을 저장 상태로 표시">초안 저장</button>
        <button type="button" className="primary" onClick={() => onStatusChange("approved")} aria-label="문의 승인 상태로 변경">승인</button>
        <button type="button" onClick={() => onStatusChange("hold")} aria-label="문의 보류 상태로 변경">보류</button>
        <button type="button" onClick={() => onStatusChange("ignored")} aria-label="문의 무시 상태로 변경">무시</button>
        <button type="button" className="sendMock" onClick={onMockSend} aria-label="실제 전송 없이 목업 전송 기록 추가">목업 전송 로그</button>
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
