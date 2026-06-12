import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS } from "./labels"
import type { Analysis, InstagramEvent } from "./types"

function formatField(value: string | null): string {
  return value ?? "미정"
}

export function buildDraftReply(event: InstagramEvent, analysis: Analysis): string {
  const missingQuestions = analysis.fields.missing
    .map((field) => `- ${MISSING_FIELD_LABELS[field]}`)
    .join("\n")

  if (analysis.classification === "spam") {
    return `${event.senderName}님, 메시지 확인했습니다. 현재 관련 없는 홍보성 요청은 별도 진행이 어렵습니다. 필요한 문의가 있으시면 구체적인 내용을 다시 남겨주세요. 감사합니다.`
  }

  if (analysis.classification === "partnership") {
    return `${event.senderName}님, 제안 감사합니다.\n\n검토를 위해 제휴 목적, 제안 내용, 희망 일정, 담당자 연락처를 보내주시면 내부 확인 후 답변드리겠습니다.`
  }

  const missingBlock =
    missingQuestions.length > 0
      ? `\n\n정확한 확인을 위해 아래 정보만 추가로 부탁드립니다.\n${missingQuestions}`
      : ""

  return `${event.senderName}님, 문의 감사합니다. 남겨주신 내용은 ${CLASSIFICATION_LABELS[analysis.classification]}로 확인했습니다.\n\n현재 파악한 내용은 아래와 같습니다.\n- 의도/주제: ${formatField(analysis.fields.topic)}\n- 상품/서비스: ${formatField(analysis.fields.productOrService)}\n- 지역/채널: ${formatField(analysis.fields.locationOrChannel)}\n- 요청 일시: ${formatField(analysis.fields.requestedDateTime)}\n- 예산/가격: ${formatField(analysis.fields.budgetOrPrice)}\n- 연락처: ${formatField(analysis.fields.contact)}\n- 주문/예약번호: ${formatField(analysis.fields.orderOrReservationRef)}${missingBlock}\n\n정보 확인 후 가능한 답변이나 다음 진행 방법을 정리해서 안내드리겠습니다.`
}
