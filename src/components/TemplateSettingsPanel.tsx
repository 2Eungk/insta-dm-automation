import { useState } from "react"
import { CLASSIFICATION_LABELS, REPLY_TONE_LABELS } from "../domain/labels"
import {
  renderDraftTemplate,
  validateTemplate,
  type ConfigWarning,
  type TemplateConfig,
} from "../domain/localConfig"
import { CLASSIFICATIONS, REPLY_TONES, type Classification, type EventViewModel, type ReplyTone } from "../domain/types"

type TemplateSettingsPanelProps = {
  readonly selectedItem: EventViewModel | null
  readonly initialTone: ReplyTone
  readonly templateConfig: TemplateConfig
  readonly onTemplateChange: (classification: Classification, tone: ReplyTone, template: string) => void
  readonly onResetTemplates: () => void
  readonly renderWarnings: (warnings: readonly ConfigWarning[]) => React.JSX.Element
}

function selectClassification(value: string, current: Classification): Classification {
  return CLASSIFICATIONS.find((classification) => classification === value) ?? current
}

function selectTone(value: string, current: ReplyTone): ReplyTone {
  return REPLY_TONES.find((tone) => tone === value) ?? current
}

export function TemplateSettingsPanel({
  selectedItem,
  initialTone,
  templateConfig,
  onTemplateChange,
  onResetTemplates,
  renderWarnings,
}: TemplateSettingsPanelProps): React.JSX.Element {
  const [classification, setClassification] = useState<Classification>(selectedItem?.analysis.classification ?? "product")
  const [tone, setTone] = useState<ReplyTone>(initialTone)
  const template = templateConfig[classification][tone]
  const preview =
    selectedItem === null
      ? "왼쪽 인박스에서 메시지를 선택하면 이 템플릿이 실제 목업 문의에 적용된 미리보기를 볼 수 있습니다."
      : renderDraftTemplate(template, selectedItem.event, selectedItem.analysis, tone)

  return (
    <section className="settingsPanel" aria-labelledby="template-settings-title">
      <header className="panelHeader compact">
        <div>
          <p>Template Builder</p>
          <strong id="template-settings-title">분류·톤별 답장 템플릿</strong>
        </div>
        <button type="button" onClick={onResetTemplates}>기본값 복원</button>
      </header>
      <p className="helperText">
        브라우저 localStorage에만 저장됩니다. 실제 Meta 템플릿, 승인 심사, 자동 발송 설정을 만들지 않습니다.
      </p>
      <div className="settingsGrid">
        <label>
          <span>분류</span>
          <select value={classification} onChange={(event) => setClassification(selectClassification(event.target.value, classification))}>
            {CLASSIFICATIONS.map((option) => (
              <option key={option} value={option}>{CLASSIFICATION_LABELS[option]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>톤</span>
          <select value={tone} onChange={(event) => setTone(selectTone(event.target.value, tone))}>
            {REPLY_TONES.map((option) => (
              <option key={option} value={option}>{REPLY_TONE_LABELS[option]}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="templateEditor">
        <span>템플릿 본문</span>
        <textarea
          value={template}
          onChange={(event) => onTemplateChange(classification, tone, event.target.value)}
          aria-label="답장 템플릿 본문"
        />
      </label>
      <div className="placeholderTray" aria-label="사용 가능한 템플릿 변수">
        {["{senderName}", "{senderHandle}", "{classificationLabel}", "{fieldSummary}", "{missingQuestions}", "{reviewReminder}"].map((token) => (
          <code key={token}>{token}</code>
        ))}
      </div>
      {renderWarnings(validateTemplate(template))}
      <section className="templatePreview" aria-label="선택 메시지 템플릿 미리보기">
        <span>선택 메시지 미리보기</span>
        <pre>{preview}</pre>
      </section>
    </section>
  )
}
