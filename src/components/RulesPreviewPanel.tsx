import { buildAutomationRules, describeMissingInfoRules } from "../domain/automation"
import type { RuleConfig } from "../domain/localConfig"

function ruleTone(ruleType: string): string {
  switch (ruleType) {
    case "classification":
      return "rule-classification"
    case "priority":
      return "rule-priority"
    case "missing-info":
      return "rule-missing"
    default:
      return "rule-classification"
  }
}

type RulesPreviewPanelProps = {
  readonly ruleConfig: RuleConfig
}

export function RulesPreviewPanel({ ruleConfig }: RulesPreviewPanelProps): React.JSX.Element {
  const automationRules = buildAutomationRules(ruleConfig)
  const missingInfoRules = describeMissingInfoRules(ruleConfig.missingFieldRequirements)

  return (
    <section className="rulesPanel" aria-label="자동화 룰 미리보기">
      <header className="panelHeader compact">
        <div>
          <p>Rules Preview</p>
          <strong>로컬 자동화 기준</strong>
        </div>
        <span title="데모용 설명 카드입니다. 실제 자동화 룰 저장소나 Meta 설정을 편집하지 않습니다.">
          로컬 설정
        </span>
      </header>
      <p className="helperText">
        키워드 기반 분류와 누락정보 질문이 어떻게 초안에 반영되는지 보여주는 로컬 미리보기입니다.
      </p>
      <div className="ruleCardGrid">
        {automationRules.map((rule) => (
          <article key={rule.id} className={`ruleCard ${ruleTone(rule.ruleType)}`}>
            <label>
              <span>{rule.title}</span>
              <input value={rule.outcome} readOnly aria-label={`${rule.title} 결과`} />
            </label>
            <div>
              {rule.criteria.map((criterion) => (
                <em key={criterion}>{criterion}</em>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="missingRuleList" aria-label="분류별 누락정보 요구사항">
        {missingInfoRules.map((rule) => (
          <span key={rule}>{rule}</span>
        ))}
      </div>
    </section>
  )
}
