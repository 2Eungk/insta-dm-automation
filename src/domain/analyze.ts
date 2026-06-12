import { classifyMessage } from "./classifier"
import { extractFields } from "./extractor"
import type { Analysis, InstagramEvent } from "./types"

export function analyzeEvent(event: InstagramEvent): Analysis {
  const classification = classifyMessage(event.message)
  return {
    classification: classification.classification,
    confidence: classification.confidence,
    fields: extractFields(event.message, classification.classification),
  }
}
