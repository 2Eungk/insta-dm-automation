import { classifyMessage } from "./classifier"
import { extractFields } from "./extractor"
import { DEFAULT_RULE_CONFIG, type RuleConfig } from "./localConfig"
import type { Analysis, InstagramEvent } from "./types"

export function analyzeEvent(event: InstagramEvent, ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG): Analysis {
  const classification = classifyMessage(event.message, ruleConfig)
  return {
    classification: classification.classification,
    confidence: classification.confidence,
    fields: extractFields(event.message, classification.classification, ruleConfig),
  }
}
