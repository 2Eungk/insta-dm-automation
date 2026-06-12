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
    return `${event.senderName}님, 메시지 확인했습니다. 현재 촬영 문의와 직접 관련된 요청만 답변드리고 있어 별도 진행은 어렵습니다. 감사합니다.`
  }

  if (analysis.classification === "collaboration") {
    return `${event.senderName}님, 제안 감사합니다. FlowStore는 화면의 목적과 현장 운영이 분명한 협업을 우선 검토합니다.\n\n가능하시다면 협업 목표, 예상 일정, 레퍼런스, 역할 범위를 보내주세요. 확인 후 맞는 방식이면 짧게 미팅 일정 제안드리겠습니다.`
  }

  const missingBlock =
    missingQuestions.length > 0
      ? `\n\n정확한 견적과 일정 확인을 위해 아래 정보만 추가로 부탁드립니다.\n${missingQuestions}`
      : ""

  return `${event.senderName}님, 문의 감사합니다. 남겨주신 내용 기준으로 ${CLASSIFICATION_LABELS[analysis.classification]}로 확인했습니다.\n\n현재 파악한 내용은 아래와 같습니다.\n- 촬영종류: ${formatField(analysis.fields.shootType)}\n- 지역: ${formatField(analysis.fields.location)}\n- 희망일: ${formatField(analysis.fields.preferredDate)}\n- 예산: ${formatField(analysis.fields.budget)}\n- 연락처: ${formatField(analysis.fields.contact)}${missingBlock}\n\nFlowStore는 현장에서 바로 실행 가능한 구성으로 콘셉트, 동선, 컷 구성까지 함께 잡아드립니다. 정보 확인되면 가능 일정과 예상 진행안을 간단히 정리해드리겠습니다.`
}
