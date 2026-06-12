import { useEffect, useState } from "react"
import {
  DEFAULT_RULE_CONFIG,
  DEFAULT_TEMPLATE_CONFIG,
  type RuleConfig,
  type TemplateConfig,
} from "../domain/localConfig"
import type { Classification, MissingField, ReplyTone } from "../domain/types"
import {
  loadRuleConfig,
  loadTemplateConfig,
  saveRuleConfig,
  saveTemplateConfig,
} from "../storage/localAutomationConfig"

export type LocalAutomationConfigState = {
  readonly templateConfig: TemplateConfig
  readonly ruleConfig: RuleConfig
  readonly updateTemplate: (classification: Classification, tone: ReplyTone, template: string) => void
  readonly resetTemplates: () => void
  readonly updateKeywordGroups: (classification: Classification, keywords: readonly string[]) => void
  readonly updateClassificationHint: (classification: Classification, hint: string) => void
  readonly toggleMissingField: (classification: Classification, field: MissingField) => void
  readonly resetRules: () => void
}

export function useLocalAutomationConfig(): LocalAutomationConfigState {
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>(() => loadTemplateConfig())
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(() => loadRuleConfig())

  useEffect(() => saveTemplateConfig(templateConfig), [templateConfig])
  useEffect(() => saveRuleConfig(ruleConfig), [ruleConfig])

  function updateTemplate(classification: Classification, tone: ReplyTone, template: string): void {
    setTemplateConfig((config) => ({
      ...config,
      [classification]: {
        ...config[classification],
        [tone]: template,
      },
    }))
  }

  function updateKeywordGroups(classification: Classification, keywords: readonly string[]): void {
    setRuleConfig((config) => ({
      ...config,
      keywordGroups: {
        ...config.keywordGroups,
        [classification]: keywords,
      },
    }))
  }

  function updateClassificationHint(classification: Classification, hint: string): void {
    setRuleConfig((config) => ({
      ...config,
      classificationHints: {
        ...config.classificationHints,
        [classification]: hint,
      },
    }))
  }

  function toggleMissingField(classification: Classification, field: MissingField): void {
    setRuleConfig((config) => {
      const currentFields = config.missingFieldRequirements[classification]
      const nextFields = currentFields.includes(field)
        ? currentFields.filter((currentField) => currentField !== field)
        : [...currentFields, field]

      return {
        ...config,
        missingFieldRequirements: {
          ...config.missingFieldRequirements,
          [classification]: nextFields,
        },
      }
    })
  }

  return {
    templateConfig,
    ruleConfig,
    updateTemplate,
    resetTemplates: () => setTemplateConfig(DEFAULT_TEMPLATE_CONFIG),
    updateKeywordGroups,
    updateClassificationHint,
    toggleMissingField,
    resetRules: () => setRuleConfig(DEFAULT_RULE_CONFIG),
  }
}
