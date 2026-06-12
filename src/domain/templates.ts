import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS } from "./labels"
import { appendEuroParticle } from "./korean"
import { DEFAULT_TEMPLATE_CONFIG, renderDraftTemplate, type TemplateConfig } from "./localConfig"
import type { Analysis, InstagramEvent, ReplyTone } from "./types"

function formatField(value: string | null): string {
  return value ?? "미정"
}

function toneOpening(event: InstagramEvent, tone: ReplyTone): string {
  switch (tone) {
    case "friendly":
      return `${event.senderName}님, 문의 남겨주셔서 감사합니다.`
    case "concise":
      return `${event.senderName}님, 문의 확인했습니다.`
    case "professional":
      return `${event.senderName}님, 문의 접수 및 내용 확인했습니다.`
    case "casual":
      return `${event.senderName}님, 메시지 확인했어요.`
  }
}

function toneClosing(tone: ReplyTone): string {
  switch (tone) {
    case "friendly":
      return "정보 확인 후 가능한 답변이나 다음 진행 방법을 정리해서 안내드리겠습니다."
    case "concise":
      return "확인 후 다음 진행 방법을 안내드리겠습니다."
    case "professional":
      return "확인되는 대로 후속 안내와 진행 가능 범위를 전달드리겠습니다."
    case "casual":
      return "확인하고 다음 안내를 편하게 이어드릴게요."
  }
}

export function buildDraftReply(
  event: InstagramEvent,
  analysis: Analysis,
  tone: ReplyTone,
  templateConfig?: TemplateConfig,
): string {
  if (templateConfig !== undefined) {
    return renderDraftTemplate(templateConfig[analysis.classification][tone], event, analysis, tone)
  }

  if (DEFAULT_TEMPLATE_CONFIG[analysis.classification][tone].trim().length === 0) {
    return renderDraftTemplate(DEFAULT_TEMPLATE_CONFIG.other.friendly, event, analysis, tone)
  }

  const missingQuestions = analysis.fields.missing
    .map((field) => `- ${MISSING_FIELD_LABELS[field]}`)
    .join("\n")

  if (analysis.classification === "spam") {
    return `${toneOpening(event, tone)} 현재 관련 없는 홍보성 요청은 별도 진행이 어렵습니다. 필요한 문의가 있으시면 구체적인 내용을 다시 남겨주세요.`
  }

  if (analysis.classification === "partnership") {
    return `${toneOpening(event, tone)}\n\n제안 검토를 위해 제휴 목적, 제안 내용, 희망 일정, 담당자 연락처를 보내주시면 내부 확인 후 답변드리겠습니다.`
  }

  const missingBlock =
    missingQuestions.length > 0
      ? `\n\n정확한 확인을 위해 아래 정보만 추가로 부탁드립니다.\n${missingQuestions}`
      : ""

  return `${toneOpening(event, tone)} 남겨주신 내용은 ${appendEuroParticle(CLASSIFICATION_LABELS[analysis.classification])} 확인했습니다.\n\n현재 파악한 내용은 아래와 같습니다.\n- 의도/주제: ${formatField(analysis.fields.topic)}\n- 상품/서비스: ${formatField(analysis.fields.productOrService)}\n- 지역/채널: ${formatField(analysis.fields.locationOrChannel)}\n- 요청 일시: ${formatField(analysis.fields.requestedDateTime)}\n- 예산/가격: ${formatField(analysis.fields.budgetOrPrice)}\n- 연락처: ${formatField(analysis.fields.contact)}\n- 주문/예약번호: ${formatField(analysis.fields.orderOrReservationRef)}${missingBlock}\n\n${toneClosing(tone)}`
}
