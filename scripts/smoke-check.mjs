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
import { createState } from "./src/storage/persistence"
import type { EventViewModel, InstagramEvent } from "./src/domain/types"

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(\`\${label}: expected \${String(expected)}, received \${String(actual)}\`)
  }
}

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label)
  }
}

type ExportPayload = {
  readonly networkPolicy?: string
  readonly items?: readonly {
    readonly id?: string
    readonly classification?: string
  }[]
}

function isExportPayload(value: unknown): value is ExportPayload {
  return typeof value === "object" && value !== null
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
const analysis = analyzeEvent(event)
const item: EventViewModel = {
  event,
  analysis,
  state: createState("drafted", "확인 후 안내드리겠습니다.", []),
}
const jsonPayload: unknown = JSON.parse(buildReviewJsonExport([item], [], "generic"))
assert(isExportPayload(jsonPayload), "json export should parse to an object")
assertEqual(jsonPayload.networkPolicy, "browser-download-only", "export network policy")
assertEqual(jsonPayload.items?.[0]?.id, "smoke-1", "json export item id")
assertEqual(jsonPayload.items?.[0]?.classification, "support", "json export classification")

const csvPayload = buildReviewCsvExport([item], [])
assert(csvPayload.startsWith("id,channel,senderName"), "csv headers should be stable")
assert(csvPayload.includes('"smoke-1"'), "csv should include item id")

console.log("smoke-check: classifier, extractor, and exports passed")
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
