import { analyzeEvent } from "./analyze"
import { DEFAULT_RULE_CONFIG, DEFAULT_TEMPLATE_CONFIG, type RuleConfig, type TemplateConfig } from "./localConfig"
import { buildDraftReply } from "./templates"
import type { Analysis, InstagramEvent, ReplyTone } from "./types"

export type ManualImportReviewRow = {
  readonly event: InstagramEvent
  readonly analysis: Analysis
  readonly draft: string
  readonly status: "drafted"
  readonly source: "manual-paste-local-only"
}

function normalizeChannel(value: string | undefined): "dm" | "comment" {
  const normalized = value?.trim().toLowerCase()
  return normalized === "comment" || normalized === "댓글" ? "comment" : "dm"
}

function normalizeHandle(value: string | undefined, fallbackIndex: number): string {
  const trimmed = value?.trim() ?? ""
  if (trimmed.length === 0) {
    return `@manual_${fallbackIndex + 1}`
  }
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

function splitManualLine(line: string): readonly string[] {
  if (line.includes("|")) {
    return line.split("|").map((part) => part.trim())
  }
  return line.split(",").map((part) => part.trim())
}

export function parseManualImportText(text: string): readonly InstagramEvent[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line, index) => {
      const parts = splitManualLine(line)
      if (parts.length < 4) {
        return []
      }

      const [senderName, senderHandle, channel, ...messageParts] = parts
      const message = messageParts.join(line.includes("|") ? " | " : ", ").trim()
      if (senderName === undefined || senderName.trim().length === 0 || message.length === 0) {
        return []
      }

      return [{
        id: `manual_${index + 1}`,
        channel: normalizeChannel(channel),
        senderName: senderName.trim(),
        senderHandle: normalizeHandle(senderHandle, index),
        receivedAt: new Date(0).toISOString(),
        message,
      }]
    })
}

export function buildManualImportReviewRows(
  text: string,
  replyTone: ReplyTone = "friendly",
  ruleConfig: RuleConfig = DEFAULT_RULE_CONFIG,
  templateConfig: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
): readonly ManualImportReviewRow[] {
  return parseManualImportText(text).map((event) => {
    const analysis = analyzeEvent(event, ruleConfig)
    return {
      event,
      analysis,
      draft: buildDraftReply(event, analysis, replyTone, templateConfig),
      status: "drafted",
      source: "manual-paste-local-only",
    }
  })
}
