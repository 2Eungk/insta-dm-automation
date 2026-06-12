import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS, REPLY_TONE_LABELS } from "./labels"
import type { Analysis, Classification, InstagramEvent, MissingField, ReplyTone } from "./types"

export type TemplateConfig = Readonly<Record<Classification, Readonly<Record<ReplyTone, string>>>>
export type RuleConfig = {
  readonly keywordGroups: Readonly<Record<Classification, readonly string[]>>
  readonly classificationHints: Readonly<Record<Classification, string>>
  readonly missingFieldRequirements: Readonly<Record<Classification, readonly MissingField[]>>
}

export type ConfigWarning = {
  readonly id: string
  readonly severity: "warning" | "critical"
  readonly label: string
  readonly detail: string
}

export const DEFAULT_KEYWORD_GROUPS: RuleConfig["keywordGroups"] = {
  product: ["상품", "제품", "재고", "입고", "사이즈", "색상", "구매", "판매", "품절"],
  quote: ["견적", "비용", "예산", "얼마", "가격", "금액", "단가", "견적서"],
  booking: ["예약", "일정", "가능", "시간", "방문", "상담", "클래스", "언제"],
  support: ["배송", "교환", "환불", "불량", "누락", "주문", "예약번호", "취소", "불편", "컴플레인"],
  partnership: ["협업", "제휴", "공동", "제안", "콜라보", "파트너", "입점", "공급사"],
  spam: ["팔로워", "무료 체험", "링크 클릭", "수익", "홍보", "http", "투자", "자동화"],
  other: [],
}

export const DEFAULT_CLASSIFICATION_HINTS: RuleConfig["classificationHints"] = {
  product: "상품, 재고, 옵션, 구매 가능 여부를 우선 확인합니다.",
  quote: "가격, 견적, 예산, 단가 질문을 견적 큐로 보냅니다.",
  booking: "예약, 방문, 상담 일정, 클래스 문의를 일정 검토로 분류합니다.",
  support: "배송, 환불, 취소, 불편, 주문번호가 있으면 고객지원으로 올립니다.",
  partnership: "협업, 제휴, 콜라보, 입점 제안을 별도 검토로 둡니다.",
  spam: "링크 클릭, 수익, 팔로워, 자동화 홍보는 발송 제한 후보로 표시합니다.",
  other: "키워드 점수가 낮은 문의는 사람이 직접 검토하도록 둡니다.",
}

export const DEFAULT_MISSING_FIELD_REQUIREMENTS: RuleConfig["missingFieldRequirements"] = {
  product: ["productOrService", "budgetOrPrice"],
  quote: ["topic", "productOrService", "budgetOrPrice", "contact"],
  booking: ["requestedDateTime", "locationOrChannel", "contact"],
  support: ["orderOrReservationRef", "contact"],
  partnership: ["topic", "requestedDateTime", "contact"],
  spam: [],
  other: ["topic", "contact"],
}

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  keywordGroups: DEFAULT_KEYWORD_GROUPS,
  classificationHints: DEFAULT_CLASSIFICATION_HINTS,
  missingFieldRequirements: DEFAULT_MISSING_FIELD_REQUIREMENTS,
}

const REVIEW_REMINDER = "※ 실제 발송 전 운영자가 검토하고 승인해야 합니다."

function buildTemplate(opening: string, closing: string): string {
  return `${opening}\n\n{classificationLabel}로 확인했습니다.\n{fieldSummary}\n{missingQuestions}\n\n${REVIEW_REMINDER}\n${closing}`
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  product: {
    friendly: buildTemplate("{senderName}님, 문의 남겨주셔서 감사합니다.", "확인 후 가능한 옵션과 다음 안내를 정리해 드리겠습니다."),
    concise: buildTemplate("{senderName}님, 문의 확인했습니다.", "확인 후 필요한 안내를 드리겠습니다."),
    professional: buildTemplate("{senderName}님, 문의 접수 및 내용 확인했습니다.", "확인되는 대로 진행 가능 범위를 전달드리겠습니다."),
    casual: buildTemplate("{senderName}님, 메시지 확인했어요.", "확인하고 편하게 이어서 안내드릴게요."),
  },
  quote: {
    friendly: buildTemplate("{senderName}님, 견적 문의 감사합니다.", "정보 확인 후 예상 비용과 진행 방법을 안내드리겠습니다."),
    concise: buildTemplate("{senderName}님, 견적 문의 확인했습니다.", "확인 후 견적 가능 범위를 안내드리겠습니다."),
    professional: buildTemplate("{senderName}님, 견적 요청 내용을 접수했습니다.", "확인되는 대로 비용 산정 기준과 후속 절차를 전달드리겠습니다."),
    casual: buildTemplate("{senderName}님, 견적 문의 확인했어요.", "확인하고 알기 쉽게 정리해 드릴게요."),
  },
  booking: {
    friendly: buildTemplate("{senderName}님, 예약 문의 남겨주셔서 감사합니다.", "일정 확인 후 가능한 시간과 다음 절차를 안내드리겠습니다."),
    concise: buildTemplate("{senderName}님, 예약 문의 확인했습니다.", "확인 후 가능 일정을 안내드리겠습니다."),
    professional: buildTemplate("{senderName}님, 예약/일정 문의를 접수했습니다.", "내부 일정 확인 후 진행 가능 시간을 전달드리겠습니다."),
    casual: buildTemplate("{senderName}님, 예약 메시지 확인했어요.", "일정 확인하고 편하게 안내드릴게요."),
  },
  support: {
    friendly: buildTemplate("{senderName}님, 불편을 드렸다면 죄송합니다. 문의 내용 확인했습니다.", "확인 후 처리 방향과 필요한 추가 절차를 안내드리겠습니다."),
    concise: buildTemplate("{senderName}님, 고객지원 문의 확인했습니다.", "확인 후 처리 방향을 안내드리겠습니다."),
    professional: buildTemplate("{senderName}님, 고객지원 문의를 접수했습니다.", "관련 정보를 확인한 뒤 후속 조치와 안내 가능 범위를 전달드리겠습니다."),
    casual: buildTemplate("{senderName}님, 문의 확인했어요. 불편하셨다면 죄송합니다.", "확인하고 다음 조치를 안내드릴게요."),
  },
  partnership: {
    friendly: buildTemplate("{senderName}님, 제안 남겨주셔서 감사합니다.", "제휴 목적과 일정 확인 후 검토 가능 여부를 안내드리겠습니다."),
    concise: buildTemplate("{senderName}님, 제휴 제안 확인했습니다.", "확인 후 검토 가능 여부를 안내드리겠습니다."),
    professional: buildTemplate("{senderName}님, 제휴/협업 제안을 접수했습니다.", "제안 범위와 담당자 정보를 확인한 뒤 후속 안내를 드리겠습니다."),
    casual: buildTemplate("{senderName}님, 제안 확인했어요.", "내용 확인하고 검토 가능 여부를 편하게 안내드릴게요."),
  },
  spam: {
    friendly: buildTemplate("{senderName}님, 메시지 확인했습니다.", "관련 없는 홍보성 요청은 진행이 어렵고, 필요한 문의만 구체적으로 남겨주세요."),
    concise: buildTemplate("{senderName}님, 메시지 확인했습니다.", "홍보성 요청은 진행하지 않습니다."),
    professional: buildTemplate("{senderName}님, 메시지 내용을 확인했습니다.", "정책상 홍보성 또는 의심 링크 요청은 진행하지 않습니다."),
    casual: buildTemplate("{senderName}님, 메시지 봤어요.", "홍보성 요청은 진행하기 어렵습니다."),
  },
  other: {
    friendly: buildTemplate("{senderName}님, 문의 남겨주셔서 감사합니다.", "내용 확인 후 필요한 안내를 정리해 드리겠습니다."),
    concise: buildTemplate("{senderName}님, 문의 확인했습니다.", "확인 후 안내드리겠습니다."),
    professional: buildTemplate("{senderName}님, 문의 접수 및 내용 확인했습니다.", "확인되는 대로 후속 안내를 전달드리겠습니다."),
    casual: buildTemplate("{senderName}님, 메시지 확인했어요.", "확인하고 편하게 안내드릴게요."),
  },
}

function formatField(label: string, value: string | null): string {
  return `- ${label}: ${value ?? "미정"}`
}

export function renderDraftTemplate(
  template: string,
  event: InstagramEvent,
  analysis: Analysis,
  tone: ReplyTone,
): string {
  const fieldSummary = [
    formatField("의도/주제", analysis.fields.topic),
    formatField("상품/서비스", analysis.fields.productOrService),
    formatField("지역/채널", analysis.fields.locationOrChannel),
    formatField("요청 일시", analysis.fields.requestedDateTime),
    formatField("예산/가격", analysis.fields.budgetOrPrice),
    formatField("연락처", analysis.fields.contact),
    formatField("주문/예약번호", analysis.fields.orderOrReservationRef),
  ].join("\n")
  const missingQuestions =
    analysis.fields.missing.length === 0
      ? "추가로 필요한 정보는 현재 확인되지 않았습니다."
      : `정확한 확인을 위해 아래 정보만 추가로 부탁드립니다.\n${analysis.fields.missing.map((field) => `- ${MISSING_FIELD_LABELS[field]}`).join("\n")}`

  return template
    .replaceAll("{senderName}", event.senderName)
    .replaceAll("{senderHandle}", event.senderHandle)
    .replaceAll("{classificationLabel}", CLASSIFICATION_LABELS[analysis.classification])
    .replaceAll("{replyToneLabel}", REPLY_TONE_LABELS[tone])
    .replaceAll("{fieldSummary}", fieldSummary)
    .replaceAll("{missingQuestions}", missingQuestions)
    .replaceAll("{reviewReminder}", REVIEW_REMINDER)
}

export function validateTemplate(template: string): readonly ConfigWarning[] {
  const normalized = template.toLowerCase()
  const warnings: ConfigWarning[] = []
  if (template.trim().length === 0) {
    warnings.push({ id: "empty-template", severity: "critical", label: "빈 템플릿", detail: "선택한 답장 템플릿이 비어 있습니다." })
  }
  if (!/(검토|승인|운영자|사람|review)/i.test(template) && !template.includes("{reviewReminder}")) {
    warnings.push({ id: "review-wording", severity: "warning", label: "검토 문구 필요", detail: "실제 발송 전 사람의 검토/승인을 거친다는 문구를 포함하세요." })
  }
  if (/(자동\s*발송|즉시\s*전송|바로\s*발송|승인\s*없이|auto.?send)/i.test(template)) {
    warnings.push({ id: "aggressive-send", severity: "critical", label: "자동 발송 위험", detail: "승인 없이 자동 발송되는 듯한 문구는 제거해야 합니다." })
  }
  if (/(비밀번호|인증번호|보안코드|카드번호|주민등록|링크\s*클릭|http:\/\/|https:\/\/)/i.test(normalized)) {
    warnings.push({ id: "unsafe-request", severity: "critical", label: "민감정보/링크 요청", detail: "비밀번호, 인증코드, 카드정보, 링크 클릭 요청은 템플릿에 넣지 마세요." })
  }
  return warnings
}

export function validateRuleConfig(ruleConfig: RuleConfig, classification: Classification): readonly ConfigWarning[] {
  const warnings: ConfigWarning[] = []
  if (classification !== "other" && ruleConfig.keywordGroups[classification].length === 0) {
    warnings.push({ id: "empty-keywords", severity: "warning", label: "키워드 없음", detail: "이 분류의 키워드가 비어 있어 기본 분류 신뢰도가 낮아집니다." })
  }
  if (ruleConfig.classificationHints[classification].trim().length === 0) {
    warnings.push({ id: "empty-hint", severity: "warning", label: "힌트 없음", detail: "운영자가 이 분류 기준을 빠르게 확인할 수 있도록 힌트를 남기세요." })
  }
  if (ruleConfig.keywordGroups[classification].some((keyword) => /(비밀번호|인증번호|보안코드|카드번호|주민등록)/i.test(keyword))) {
    warnings.push({ id: "unsafe-keywords", severity: "critical", label: "민감정보 키워드", detail: "민감정보를 요청하거나 수집하는 규칙처럼 보이는 키워드는 제거하세요." })
  }
  return warnings
}
