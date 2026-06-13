import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function loadModule() {
  const tempDir = await mkdtemp(join(process.cwd(), ".manual-import-smoke-"))
  const outputFile = join(tempDir, "manual-import-entry.mjs")
  await build({
    stdin: {
      contents: `
        import React from "react"
        import { renderToStaticMarkup } from "react-dom/server"
        import { parseManualImportText, buildManualImportReviewRows } from "./src/domain/manualImport"
        import { ManualImportPanel } from "./src/components/ManualImportPanel"
        export { parseManualImportText, buildManualImportReviewRows }
        export function renderManualImportPanel() {
          return renderToStaticMarkup(React.createElement(ManualImportPanel))
        }
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "manual-import-entry.ts",
    },
    bundle: true,
    external: ["react", "react-dom/server"],
    format: "esm",
    jsx: "automatic",
    outfile: outputFile,
    platform: "node",
    target: "node22",
  })
  return { module: await import(pathToFileURL(outputFile).href), tempDir }
}

const { module, tempDir } = await loadModule()
try {
  const text = `민서 | @minseo | comment | 예약 가능한가요? 다음주 토요일 2명\n도윤, @doyoon, dm, 가격이랑 링크 주세요\n광고계정 | @spam | comment | 팔로워 증가 http://spam.example`
  const events = module.parseManualImportText(text)
  assert.equal(events.length, 3)
  assert.equal(events[0].senderName, "민서")
  assert.equal(events[0].senderHandle, "@minseo")
  assert.equal(events[0].channel, "comment")
  assert.equal(events[1].channel, "dm")
  assert.equal(events[1].message.includes("가격"), true)

  const rows = module.buildManualImportReviewRows(text, "friendly")
  assert.equal(rows.length, 3)
  assert.equal(rows[0].draft.includes("민서님"), true)
  assert.equal(rows[1].draft.includes("도윤님"), true)
  assert.equal(rows.some((row) => row.analysis.classification === "spam"), true)
  assert.equal(rows.every((row) => row.status === "drafted"), true)
  assert.equal(rows.every((row) => row.source === "manual-paste-local-only"), true)

  const html = module.renderManualImportPanel()
  assert.equal(html.includes("실전 붙여넣기"), true)
  assert.equal(html.includes("여기에 실제 DM/댓글을 붙여넣으면"), true)
  assert.equal(html.includes("분류·초안 생성"), true)
  assert.equal(html.includes("자동발송 없음"), true)
  assert.equal(html.includes("초안 복사"), true)
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("manual-import-smoke-check: local paste-to-draft workflow passed")
