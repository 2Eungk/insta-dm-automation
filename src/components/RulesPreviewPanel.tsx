import { AUTOMATION_RULES, describeMissingInfoRules } from "../domain/automation"

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

export function RulesPreviewPanel(): React.JSX.Element {
  const missingInfoRules = describeMissingInfoRules()

  return (
    <section className="rulesPanel" aria-label="자동화 룰 미리보기">
      <header className="panelHeader compact">
        <div>
          <p>Rules Preview</p>
          <strong>로컬 자동화 기준</strong>
        </div>
        <span>편집형 카드</span>
      </header>
      <div className="ruleCardGrid">
        {AUTOMATION_RULES.map((rule) => (
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
