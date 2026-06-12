import type { EventViewModel } from "./types"

export type QualityCheck = {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly state: "pass" | "warn"
}

function containsSenderName(item: EventViewModel): boolean {
  return item.state.draft.includes(`${item.event.senderName}님`) || item.state.draft.includes(item.event.senderName)
}

function asksForMissingInfo(item: EventViewModel): boolean {
  return item.analysis.fields.missing.length === 0 || item.state.draft.includes("추가") || item.state.draft.includes("부탁")
}

function handlesReference(item: EventViewModel): boolean {
  return item.analysis.fields.orderOrReservationRef === null || item.state.draft.includes("주문/예약번호")
}

export function getDraftQualityChecks(item: EventViewModel): readonly QualityCheck[] {
  const personalization = containsSenderName(item)
  const missingInfo = asksForMissingInfo(item)
  const noAutoSend = item.state.sentLog.length === 0
  const spamCaution = item.analysis.classification !== "spam" || item.state.status !== "approved"
  const referenceHandling = handlesReference(item)

  return [
    {
      id: "personalization",
      label: "개인화",
      detail: personalization ? "고객 이름 또는 핸들이 초안에 반영됐습니다." : "고객 식별 문구를 한 번 더 넣는 편이 안전합니다.",
      state: personalization ? "pass" : "warn",
    },
    {
      id: "missing-info",
      label: "누락정보 요청",
      detail: missingInfo ? "필요한 추가 정보 요청이 초안에 포함되어 있습니다." : "누락된 필드를 답장에 명시해야 합니다.",
      state: missingInfo ? "pass" : "warn",
    },
    {
      id: "human-loop",
      label: "자동 발송 차단",
      detail: noAutoSend ? "목업 전송 기록 전이며 사람이 승인해야 합니다." : "목업 기록만 남았고 실제 Meta 전송은 없습니다.",
      state: "pass",
    },
    {
      id: "spam-caution",
      label: "스팸 주의",
      detail: spamCaution ? "스팸 후보를 바로 승인하지 않는 흐름입니다." : "스팸 후보는 승인 전 무시 또는 보류가 더 안전합니다.",
      state: spamCaution ? "pass" : "warn",
    },
    {
      id: "reference-handling",
      label: "연락처/주문번호",
      detail: referenceHandling ? "식별 정보가 있거나 요청 문구가 포함되어 있습니다." : "주문/예약번호가 있어 내부 조회 안내를 명확히 해야 합니다.",
      state: referenceHandling ? "pass" : "warn",
    },
  ]
}
