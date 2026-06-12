import { useState } from "react"
import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS } from "../domain/labels"
import { validateRuleConfig, type ConfigWarning, type RuleConfig } from "../domain/localConfig"
import { CLASSIFICATIONS, MISSING_FIELDS, type Classification, type MissingField } from "../domain/types"

type RuleSettingsPanelProps = {
  readonly ruleConfig: RuleConfig
  readonly onKeywordGroupsChange: (classification: Classification, keywords: readonly string[]) => void
  readonly onClassificationHintChange: (classification: Classification, hint: string) => void
  readonly onMissingFieldToggle: (classification: Classification, field: MissingField) => void
  readonly onResetRules: () => void
  readonly renderWarnings: (warnings: readonly ConfigWarning[]) => React.JSX.Element
}

function parseKeywords(value: string): readonly string[] {
  return value
    .split(/[\n,]/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0)
}

function selectClassification(value: string, current: Classification): Classification {
  return CLASSIFICATIONS.find((classification) => classification === value) ?? current
}

export function RuleSettingsPanel({
  ruleConfig,
  onKeywordGroupsChange,
  onClassificationHintChange,
  onMissingFieldToggle,
  onResetRules,
  renderWarnings,
}: RuleSettingsPanelProps): React.JSX.Element {
  const [classification, setClassification] = useState<Classification>("product")
  const keywords = ruleConfig.keywordGroups[classification].join("\n")
  const missingFields = ruleConfig.missingFieldRequirements[classification]

  return (
    <section className="settingsPanel" aria-labelledby="rule-settings-title">
      <header className="panelHeader compact">
        <div>
          <p>Rule Editor</p>
          <strong id="rule-settings-title">키워드·힌트·누락정보 규칙</strong>
        </div>
        <button type="button" onClick={onResetRules}>기본값 복원</button>
      </header>
      <p className="helperText">
        분류 힌트와 필수 필드만 로컬로 조정합니다. 실제 웹훅, 권한, 토큰 저장소, 자동 발송 정책은 생성하지 않습니다.
      </p>
      <label>
        <span>분류</span>
        <select value={classification} onChange={(event) => setClassification(selectClassification(event.target.value, classification))}>
          {CLASSIFICATIONS.map((option) => (
            <option key={option} value={option}>{CLASSIFICATION_LABELS[option]}</option>
          ))}
        </select>
      </label>
      <label className="keywordEditor">
        <span>키워드 그룹</span>
        <textarea
          value={keywords}
          onChange={(event) => onKeywordGroupsChange(classification, parseKeywords(event.target.value))}
          aria-label="분류 키워드 그룹"
        />
      </label>
      <label>
        <span>운영자 분류 힌트</span>
        <input
          value={ruleConfig.classificationHints[classification]}
          onChange={(event) => onClassificationHintChange(classification, event.target.value)}
          aria-label="운영자 분류 힌트"
        />
      </label>
      <fieldset className="missingFieldEditor">
        <legend>누락정보 요구사항</legend>
        {MISSING_FIELDS.map((field) => (
          <label key={field}>
            <input
              type="checkbox"
              checked={missingFields.includes(field)}
              onChange={() => onMissingFieldToggle(classification, field)}
            />
            <span>{MISSING_FIELD_LABELS[field]}</span>
          </label>
        ))}
      </fieldset>
      {renderWarnings(validateRuleConfig(ruleConfig, classification))}
    </section>
  )
}
