import type { EventViewModel, ReviewPriority, ReviewSignal } from "./types"

export type QueueSummary = {
  readonly newCount: number
  readonly needsInfoCount: number
  readonly highPriorityCount: number
  readonly approvedCount: number
}

const urgentSupportKeywords = ["불편", "컴플레인", "환불", "취소", "불량", "누락", "아직", "긴급"] as const

function includesUrgentSupportCue(message: string): boolean {
  return urgentSupportKeywords.some((keyword) => message.includes(keyword))
}

export function getReviewSignals(item: EventViewModel): readonly ReviewSignal[] {
  const signals: ReviewSignal[] = []
  const fields = item.analysis.fields

  if (item.analysis.classification === "spam") {
    signals.push({
      id: "spam",
      label: "스팸 후보",
      detail: "홍보성/외부 링크 가능성이 높아 수동 승인 전 응답을 제한합니다.",
      severity: "high",
    })
  }

  if (item.analysis.classification === "support" && includesUrgentSupportCue(item.event.message)) {
    signals.push({
      id: "urgent-support",
      label: "긴급 지원",
      detail: "불편, 취소, 환불, 누락 등 빠른 확인이 필요한 문구가 있습니다.",
      severity: "high",
    })
  }

  if (fields.missing.includes("contact")) {
    signals.push({
      id: "missing-contact",
      label: "연락처 누락",
      detail: "담당자 후속 안내나 예약/지원 처리에 필요한 연락처가 없습니다.",
      severity: "medium",
    })
  }

  if (fields.missing.length > 0) {
    signals.push({
      id: "needs-info",
      label: "추가 정보 필요",
      detail: `${fields.missing.length}개 필드가 비어 있어 승인 전 확인이 필요합니다.`,
      severity: "medium",
    })
  }

  if (fields.orderOrReservationRef !== null) {
    signals.push({
      id: "reference-present",
      label: "주문/예약번호 있음",
      detail: "내부 조회나 지원 라우팅에 사용할 식별 정보가 포함되어 있습니다.",
      severity: "positive",
    })
  }

  if (item.analysis.confidence < 0.5) {
    signals.push({
      id: "low-confidence",
      label: "분류 신뢰도 낮음",
      detail: "분류 근거가 약하므로 답장 전 메시지 맥락을 다시 확인합니다.",
      severity: "neutral",
    })
  }

  return signals
}

export function getReviewPriority(item: EventViewModel): ReviewPriority {
  const signals = getReviewSignals(item)
  if (signals.some((signal) => signal.severity === "high")) {
    return "high"
  }

  if (signals.some((signal) => signal.severity === "medium")) {
    return "medium"
  }

  return "normal"
}

export function summarizeQueue(items: readonly EventViewModel[]): QueueSummary {
  return items.reduce(
    (summary, item) => ({
      newCount: summary.newCount + (item.state.status === "new" ? 1 : 0),
      needsInfoCount: summary.needsInfoCount + (item.analysis.fields.missing.length > 0 ? 1 : 0),
      highPriorityCount: summary.highPriorityCount + (getReviewPriority(item) === "high" ? 1 : 0),
      approvedCount: summary.approvedCount + (item.state.status === "approved" ? 1 : 0),
    }),
    { newCount: 0, needsInfoCount: 0, highPriorityCount: 0, approvedCount: 0 },
  )
}
