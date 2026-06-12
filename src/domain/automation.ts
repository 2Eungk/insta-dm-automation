import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS } from "./labels"
import { DEFAULT_RULE_CONFIG, type RuleConfig } from "./localConfig"
import { CLASSIFICATIONS, type Classification, type MissingField } from "./types"

export type AutomationRule = {
  readonly id: string
  readonly title: string
  readonly ruleType: "classification" | "priority" | "missing-info"
  readonly criteria: readonly string[]
  readonly outcome: string
}

function formatCriteria(values: readonly string[]): readonly string[] {
  return values.length === 0 ? ["키워드 없음, 사람이 직접 검토"] : values.slice(0, 6)
}

export function buildAutomationRules(ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG): readonly AutomationRule[] {
  return [
    {
      id: "classification-keywords",
      title: "분류 룰",
      ruleType: "classification",
      criteria: formatCriteria([
        ...ruleConfig.keywordGroups.product.slice(0, 2),
        ...ruleConfig.keywordGroups.quote.slice(0, 2),
        ...ruleConfig.keywordGroups.support.slice(0, 2),
      ]),
      outcome: "문의 유형과 신뢰도를 로컬에서 계산합니다.",
    },
    {
      id: "priority-signals",
      title: "우선순위 룰",
      ruleType: "priority",
      criteria: ["스팸 후보", "환불·취소·불편 등 긴급 지원", "연락처 또는 필수 정보 누락"],
      outcome: "High, Needs review, Normal 배지로만 표시하고 자동 전송하지 않습니다.",
    },
    {
      id: "missing-fields",
      title: "누락정보 룰",
      ruleType: "missing-info",
      criteria: formatCriteria(ruleConfig.missingFieldRequirements.support.map((field) => MISSING_FIELD_LABELS[field])),
      outcome: "답장 초안에 추가 확인 질문을 포함합니다.",
    },
  ]
}

export function describeMissingInfoRules(
  missingInfoRequirements: Readonly<Record<Classification, readonly MissingField[]>> = DEFAULT_RULE_CONFIG.missingFieldRequirements,
): readonly string[] {
  return CLASSIFICATIONS.map((classification) => {
    const label = CLASSIFICATION_LABELS[classification]
    const required = missingInfoRequirements[classification].map((field) => MISSING_FIELD_LABELS[field]).join(", ")
    return `${label}: ${required.length === 0 ? "자동 응답 제한, 필수 요청 없음" : required}`
  })
}
