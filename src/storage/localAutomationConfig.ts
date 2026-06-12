import { z } from "zod"
import {
  DEFAULT_RULE_CONFIG,
  DEFAULT_TEMPLATE_CONFIG,
  type RuleConfig,
  type TemplateConfig,
} from "../domain/localConfig"
import { CLASSIFICATIONS, MISSING_FIELDS, REPLY_TONES } from "../domain/types"
import { readLocalStorage, writeLocalStorage } from "./safeStorage"

const TEMPLATE_CONFIG_KEY = "insta-dm-automation:template-config:v1"
const RULE_CONFIG_KEY = "insta-dm-automation:rule-config:v1"

const templateByToneSchema = z.object({
  friendly: z.string(),
  concise: z.string(),
  professional: z.string(),
  casual: z.string(),
})

const templateConfigSchema = z.object({
  product: templateByToneSchema,
  quote: templateByToneSchema,
  booking: templateByToneSchema,
  support: templateByToneSchema,
  partnership: templateByToneSchema,
  spam: templateByToneSchema,
  other: templateByToneSchema,
})

const keywordGroupsSchema = z.object({
  product: z.array(z.string()),
  quote: z.array(z.string()),
  booking: z.array(z.string()),
  support: z.array(z.string()),
  partnership: z.array(z.string()),
  spam: z.array(z.string()),
  other: z.array(z.string()),
})

const classificationHintsSchema = z.object({
  product: z.string(),
  quote: z.string(),
  booking: z.string(),
  support: z.string(),
  partnership: z.string(),
  spam: z.string(),
  other: z.string(),
})

const missingRequirementsSchema = z.object({
  product: z.array(z.enum(MISSING_FIELDS)),
  quote: z.array(z.enum(MISSING_FIELDS)),
  booking: z.array(z.enum(MISSING_FIELDS)),
  support: z.array(z.enum(MISSING_FIELDS)),
  partnership: z.array(z.enum(MISSING_FIELDS)),
  spam: z.array(z.enum(MISSING_FIELDS)),
  other: z.array(z.enum(MISSING_FIELDS)),
})

const ruleConfigSchema = z.object({
  keywordGroups: keywordGroupsSchema,
  classificationHints: classificationHintsSchema,
  missingFieldRequirements: missingRequirementsSchema,
})

function parseJson(raw: string | null): unknown | null {
  if (raw === null) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null
    }
    throw error
  }
}

export function parseStoredTemplateConfig(raw: string | null): TemplateConfig {
  const parsedJson = parseJson(raw)
  const parsed = templateConfigSchema.safeParse(parsedJson)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE_CONFIG
}

export function parseStoredRuleConfig(raw: string | null): RuleConfig {
  const parsedJson = parseJson(raw)
  const parsed = ruleConfigSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return DEFAULT_RULE_CONFIG
  }

  const keywordGroups = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [
      classification,
      parsed.data.keywordGroups[classification].map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 0),
    ]),
  )
  const classificationHints = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [
      classification,
      parsed.data.classificationHints[classification].trim(),
    ]),
  )
  const missingFieldRequirements = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [
      classification,
      parsed.data.missingFieldRequirements[classification].filter(
        (field, index, fields) => fields.indexOf(field) === index,
      ),
    ]),
  )

  const normalized = ruleConfigSchema.safeParse({ keywordGroups, classificationHints, missingFieldRequirements })
  return normalized.success ? normalized.data : DEFAULT_RULE_CONFIG
}

export function loadTemplateConfig(): TemplateConfig {
  const stored = readLocalStorage(TEMPLATE_CONFIG_KEY)
  return parseStoredTemplateConfig(stored.kind === "available" ? stored.value : null)
}

export function saveTemplateConfig(templateConfig: TemplateConfig): void {
  writeLocalStorage(TEMPLATE_CONFIG_KEY, JSON.stringify(templateConfig))
}

export function loadRuleConfig(): RuleConfig {
  const stored = readLocalStorage(RULE_CONFIG_KEY)
  return parseStoredRuleConfig(stored.kind === "available" ? stored.value : null)
}

export function saveRuleConfig(ruleConfig: RuleConfig): void {
  writeLocalStorage(RULE_CONFIG_KEY, JSON.stringify(ruleConfig))
}

export { REPLY_TONES }
