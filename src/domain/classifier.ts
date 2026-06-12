import { CLASSIFICATIONS, type Classification } from "./types"
import { DEFAULT_RULE_CONFIG, type RuleConfig } from "./localConfig"

export function classifyMessage(
  message: string,
  ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG,
): { readonly classification: Classification; readonly confidence: number } {
  const normalized = message.toLowerCase()
  const scores = CLASSIFICATIONS.map((classification) => ({
    classification,
    score: ruleConfig.keywordGroups[classification].filter((keyword) => normalized.includes(keyword.toLowerCase()))
      .length,
  }))
  const top = scores.reduce((best, current) => (current.score > best.score ? current : best))

  if (top === undefined || top.score === 0) {
    return { classification: "other", confidence: 0.42 }
  }

  if (top.classification === "spam") {
    return { classification: "spam", confidence: 0.96 }
  }

  const confidence = Math.min(0.92, 0.48 + top.score * 0.14)
  return { classification: top.classification, confidence }
}
