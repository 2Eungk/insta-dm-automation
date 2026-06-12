import type { ConfigWarning, RuleConfig, TemplateConfig } from "../domain/localConfig"
import type { Classification, EventViewModel, MissingField, ReplyTone } from "../domain/types"
import { RuleSettingsPanel } from "./RuleSettingsPanel"
import { TemplateSettingsPanel } from "./TemplateSettingsPanel"

type AutomationSettingsPanelProps = {
  readonly selectedItem: EventViewModel | null
  readonly replyTone: ReplyTone
  readonly templateConfig: TemplateConfig
  readonly ruleConfig: RuleConfig
  readonly onTemplateChange: (classification: Classification, tone: ReplyTone, template: string) => void
  readonly onResetTemplates: () => void
  readonly onKeywordGroupsChange: (classification: Classification, keywords: readonly string[]) => void
  readonly onClassificationHintChange: (classification: Classification, hint: string) => void
  readonly onMissingFieldToggle: (classification: Classification, field: MissingField) => void
  readonly onResetRules: () => void
}

function WarningList({ warnings }: { readonly warnings: readonly ConfigWarning[] }): React.JSX.Element {
  if (warnings.length === 0) {
    return (
      <div className="configWarnings clear">
        <strong>검증 통과</strong>
        <span>빈 템플릿, 자동 발송, 민감정보 요청 위험이 감지되지 않았습니다.</span>
      </div>
    )
  }

  return (
    <div className="configWarnings">
      {warnings.map((warning) => (
        <article key={warning.id} className={`configWarning ${warning.severity}`}>
          <strong>{warning.label}</strong>
          <span>{warning.detail}</span>
        </article>
      ))}
    </div>
  )
}

export function AutomationSettingsPanel({
  selectedItem,
  replyTone,
  templateConfig,
  ruleConfig,
  onTemplateChange,
  onResetTemplates,
  onKeywordGroupsChange,
  onClassificationHintChange,
  onMissingFieldToggle,
  onResetRules,
}: AutomationSettingsPanelProps): React.JSX.Element {
  return (
    <section className="settingsDeck" aria-label="로컬 자동화 설정">
      <TemplateSettingsPanel
        selectedItem={selectedItem}
        initialTone={replyTone}
        templateConfig={templateConfig}
        onTemplateChange={onTemplateChange}
        onResetTemplates={onResetTemplates}
        renderWarnings={(warnings) => <WarningList warnings={warnings} />}
      />
      <RuleSettingsPanel
        ruleConfig={ruleConfig}
        onKeywordGroupsChange={onKeywordGroupsChange}
        onClassificationHintChange={onClassificationHintChange}
        onMissingFieldToggle={onMissingFieldToggle}
        onResetRules={onResetRules}
        renderWarnings={(warnings) => <WarningList warnings={warnings} />}
      />
    </section>
  )
}
