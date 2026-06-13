import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function loadModule() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-outbound-limits-"))
  const outputFile = join(tempDir, "outbound-limits-entry.mjs")
  await build({
    stdin: {
      contents: `
        import { FRIENDS_BETA_OUTBOUND_LIMIT_POLICY, evaluateOutboundLimit } from "./server/outboundAutomationLimits"
        export { FRIENDS_BETA_OUTBOUND_LIMIT_POLICY, evaluateOutboundLimit }
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "outbound-limits-entry.ts",
    },
    bundle: true,
    format: "esm",
    outfile: outputFile,
    platform: "node",
    target: "node22",
  })
  return { module: await import(pathToFileURL(outputFile).href), tempDir }
}

function at(seconds) {
  return new Date(Date.UTC(2026, 5, 13, 0, 0, seconds)).toISOString()
}

const { module, tempDir } = await loadModule()
try {
  const policy = module.FRIENDS_BETA_OUTBOUND_LIMIT_POLICY
  assert.equal(policy.sendsMessages, false)
  assert.equal(policy.autoSendEnabled, false)
  assert.equal(policy.batchSendsAllowed, false)
  assert.deepEqual(policy.windows.map((window) => [window.windowSeconds, window.maxActions]), [
    [60, 1],
    [300, 3],
    [600, 5],
    [1800, 10],
    [3600, 15],
  ])

  const first = module.evaluateOutboundLimit([], { at: at(0), recipientId: "buyer-1" })
  assert.equal(first.allowed, true)

  const tooSoon = module.evaluateOutboundLimit([{ at: at(0), recipientId: "buyer-1" }], { at: at(10), recipientId: "buyer-2" })
  assert.equal(tooSoon.allowed, false)
  assert.equal(tooSoon.reason, "global-cooldown")

  const oneMinute = module.evaluateOutboundLimit([{ at: at(0), recipientId: "buyer-1" }], { at: at(50), recipientId: "buyer-2" })
  assert.equal(oneMinute.allowed, false)
  assert.equal(oneMinute.reason, "window-limit")
  assert.equal(oneMinute.matchedWindow.label, "1 minute")

  const recipientCooldown = module.evaluateOutboundLimit([{ at: at(0), recipientId: "buyer-1" }], { at: at(300), recipientId: "buyer-1" })
  assert.equal(recipientCooldown.allowed, false)
  assert.equal(recipientCooldown.reason, "recipient-cooldown")

  const fiveMinute = module.evaluateOutboundLimit(
    [
      { at: at(0), recipientId: "buyer-1" },
      { at: at(70), recipientId: "buyer-2" },
      { at: at(140), recipientId: "buyer-3" },
    ],
    { at: at(210), recipientId: "buyer-4" },
  )
  assert.equal(fiveMinute.allowed, false)
  assert.equal(fiveMinute.reason, "window-limit")
  assert.equal(fiveMinute.matchedWindow.label, "5 minutes")
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("outbound-limits-smoke-check: conservative friends-beta throttles passed")
