import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

const entry = `
import { analyzeEvent } from "./src/domain/analyze"
import { classifyMessage } from "./src/domain/classifier"
import { extractFields } from "./src/domain/extractor"
import { buildReviewCsvExport, buildReviewJsonExport } from "./src/domain/exportReview"
import { itemMatchesFilterPreset, FILTER_PRESETS } from "./src/domain/filterPresets"
import { DEFAULT_RULE_CONFIG, DEFAULT_TEMPLATE_CONFIG, renderDraftTemplate, validateRuleConfig, validateTemplate } from "./src/domain/localConfig"
import { getSlaAge } from "./src/domain/sla"
import { SAMPLE_SCENARIO_EVENTS, SAMPLE_SCENARIO_LABELS } from "./src/data/sampleScenarios"
import { parseStoredRuleConfig, parseStoredTemplateConfig } from "./src/storage/localAutomationConfig"
import { createState } from "./src/storage/persistence"
import { SAMPLE_SCENARIOS } from "./src/domain/types"
import type { EventViewModel, InstagramEvent, Status } from "./src/domain/types"

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(\`\${label}: expected \${String(expected)}, received \${String(actual)}\`)
  }
}

function assert(condition: boolean, label: string): asserts condition {
  if (!condition) {
    throw new Error(label)
  }
}

type ExportPayload = {
  readonly sourceContext?: string
  readonly networkPolicy?: string
  readonly integrationStatus?: string
  readonly items?: readonly {
    readonly sourceContext?: string
    readonly networkPolicy?: string
    readonly integrationStatus?: string
    readonly id?: string
    readonly classification?: string
  }[]
}

function isExportPayload(value: unknown): value is ExportPayload {
  return typeof value === "object" && value !== null
}

function buildItem(event: InstagramEvent, status: Status = "drafted", draft = "확인 후 안내드리겠습니다."): EventViewModel {
  const analysis = analyzeEvent(event)
  return {
    event,
    analysis,
    state: createState(status, draft, []),
  }
}

const classification = classifyMessage("니트 재고와 사이즈 구매 가능 여부가 궁금합니다.")
assertEqual(classification.classification, "product", "product classification")
assert(classification.confidence > 0.5, "product confidence should be deterministic and useful")

const fields = extractFields("강남 상담 견적 30만원 정도로 다음 주 가능할까요? 010-1234-5678", "quote")
assertEqual(fields.locationOrChannel, "강남", "location extraction")
assertEqual(fields.budgetOrPrice, "30만원", "budget extraction")
assertEqual(fields.contact, "010-1234-5678", "contact extraction")
assert(fields.missing.length === 0, "quote sample should have required fields")

const event: InstagramEvent = {
  id: "smoke-1",
  channel: "dm",
  senderName: "Smoke Tester",
  senderHandle: "@smoke",
  receivedAt: "2026-06-12T09:00:00.000Z",
  message: "예약번호 AB1234 배송 누락으로 환불 상담 부탁드립니다. smoke@example.com",
}
const item = buildItem(event)
const jsonPayload: unknown = JSON.parse(buildReviewJsonExport([item], [], "generic"))
assert(isExportPayload(jsonPayload), "json export should parse to an object")
assertEqual(jsonPayload.sourceContext, "local-mock-fixtures", "json export source context")
assertEqual(jsonPayload.networkPolicy, "browser-download-only", "export network policy")
assertEqual(jsonPayload.integrationStatus, "no-real-instagram-connection", "json export integration status")
assertEqual(jsonPayload.items?.[0]?.sourceContext, "local-mock-fixtures", "json export item source context")
assertEqual(jsonPayload.items?.[0]?.networkPolicy, "browser-download-only", "json export item network policy")
assertEqual(jsonPayload.items?.[0]?.integrationStatus, "no-real-instagram-connection", "json export item integration status")
assertEqual(jsonPayload.items?.[0]?.id, "smoke-1", "json export item id")
assertEqual(jsonPayload.items?.[0]?.classification, "support", "json export classification")

const csvPayload = buildReviewCsvExport([item], [])
assert(csvPayload.startsWith("sourceContext,networkPolicy,integrationStatus,id,channel,senderName"), "csv headers should carry local-only metadata")
assert(csvPayload.includes('"local-mock-fixtures","browser-download-only","no-real-instagram-connection"'), "csv rows should carry local-only metadata")
assert(csvPayload.includes('"smoke-1"'), "csv should include item id")

const csvEscapedItem = buildItem(
  {
    ...event,
    id: "csv-escape",
    senderName: 'CSV "Viewer"',
  },
  "drafted",
  'Line 1, "quoted"\\nLine 2',
)
const escapedCsvPayload = buildReviewCsvExport([csvEscapedItem], [])
assert(escapedCsvPayload.includes('"CSV ""Viewer"""'), "csv should escape quotes in names")
assert(escapedCsvPayload.includes('"Line 1, ""quoted""\\nLine 2"'), "csv should keep commas, quotes, and line breaks inside one quoted cell")

const parsedTemplateConfig = parseStoredTemplateConfig(JSON.stringify(DEFAULT_TEMPLATE_CONFIG))
assertEqual(parsedTemplateConfig.product.friendly, DEFAULT_TEMPLATE_CONFIG.product.friendly, "template config serialization")
assert(validateTemplate(parsedTemplateConfig.product.friendly).length === 0, "default template should pass validation")
assert(validateTemplate("").some((warning) => warning.id === "empty-template"), "empty template should warn")
assert(validateTemplate("승인 없이 즉시 전송하고 인증번호를 링크로 보내주세요.").length >= 2, "unsafe template wording should warn")
const templatePreview = renderDraftTemplate(parsedTemplateConfig.support.professional, item.event, item.analysis, "professional")
assert(templatePreview.includes("실제 발송 전 운영자가 검토"), "template preview should include review-before-send wording")

const customRuleConfig = parseStoredRuleConfig(JSON.stringify({
  ...DEFAULT_RULE_CONFIG,
  keywordGroups: {
    ...DEFAULT_RULE_CONFIG.keywordGroups,
    quote: ["견적테스트"],
  },
  missingFieldRequirements: {
    ...DEFAULT_RULE_CONFIG.missingFieldRequirements,
    support: ["contact"],
  },
}))
const customClassification = classifyMessage("견적테스트 가능할까요?", customRuleConfig)
assertEqual(customClassification.classification, "quote", "custom keyword config should classify locally")
const customFields = extractFields("배송 누락입니다", "support", customRuleConfig)
assert(customFields.missing.includes("contact"), "custom missing-field requirements should serialize and apply")
assert(validateRuleConfig(customRuleConfig, "quote").length === 0, "custom rule config should validate")
assert(validateRuleConfig(parseStoredRuleConfig("{not-json"), "product").length === 0, "invalid rule config should fall back to defaults")

const scenarioIds = new Set<string>()
for (const scenario of SAMPLE_SCENARIOS) {
  const events = SAMPLE_SCENARIO_EVENTS[scenario]
  assert(events.length >= 4, \`\${SAMPLE_SCENARIO_LABELS[scenario]} scenario should include enough demo fixtures\`)
  for (const scenarioEvent of events) {
    assert(!scenarioIds.has(scenarioEvent.id), \`sample scenario id should be unique: \${scenarioEvent.id}\`)
    scenarioIds.add(scenarioEvent.id)
  }
}

const supportItems = SAMPLE_SCENARIO_EVENTS.support.map((scenarioEvent) => buildItem(scenarioEvent))
const supportItem = supportItems.find((candidate) => candidate.analysis.classification === "support")
const spamItem = supportItems.find((candidate) => candidate.analysis.classification === "spam")
const needsInfoItem = supportItems.find((candidate) => candidate.analysis.fields.missing.length > 0)
assert(FILTER_PRESETS.length === 6, "filter preset count should stay demo-complete")
assert(supportItem !== undefined, "support sample should include a support-classified item")
assert(spamItem !== undefined, "support sample should include a spam-review item")
assert(needsInfoItem !== undefined, "support sample should include a needs-info item")
assert(itemMatchesFilterPreset(supportItem, "supportQueue"), "support queue preset should match support items")
assert(itemMatchesFilterPreset(spamItem, "spamReview"), "spam review preset should match spam items")
assert(itemMatchesFilterPreset(needsInfoItem, "needsInfo"), "needs info preset should match missing-field items")
assert(itemMatchesFilterPreset(buildItem(event, "approved"), "approved"), "approved preset should match approved status")
assert(supportItems.every((supportSampleItem) => itemMatchesFilterPreset(supportSampleItem, "all")), "all preset should match every item")

const fixedNow = new Date("2026-06-12T12:00:00+09:00")
const newSla = getSlaAge("2026-06-12T11:30:00+09:00", fixedNow)
const olderSla = getSlaAge("2026-06-12T08:30:00+09:00", fixedNow)
const urgentSla = getSlaAge("2026-06-10T08:30:00+09:00", fixedNow)
assertEqual(newSla.label, "New", "new SLA label")
assertEqual(olderSla.label, "Older", "older SLA label")
assertEqual(urgentSla.label, "Urgent", "urgent SLA label")
assertEqual(newSla.detail, "30분 경과", "new SLA detail")
assertEqual(olderSla.detail, "3시간 경과", "older SLA detail")
assertEqual(urgentSla.detail, "2일 경과", "urgent SLA detail")

console.log("smoke-check: fixtures, presets, SLA, exports, and local config passed")
`

const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-smoke-"))
const outputFile = join(tempDir, "smoke-check.mjs")

try {
  await build({
    stdin: {
      contents: entry,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "smoke-check-entry.ts",
    },
    bundle: true,
    format: "esm",
    outfile: outputFile,
    platform: "node",
  })
  await import(pathToFileURL(outputFile).href)
} finally {
  await rm(tempDir, { force: true, recursive: true })
}
