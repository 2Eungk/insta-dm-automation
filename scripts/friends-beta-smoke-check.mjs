import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function loadRouteModule() {
  const tempDir = await mkdtemp(join(process.cwd(), ".friends-beta-smoke-"))
  const outputFile = join(tempDir, "friends-beta-entry.mjs")
  await build({
    stdin: {
      contents: `
        import React from "react"
        import { renderToStaticMarkup } from "react-dom/server"
        import { routeMetaRequest } from "./server/routes"
        import { createLocalInviteCodeGate } from "./server/friendsBetaInviteGate"
        import { SaasReadinessPanel } from "./src/components/SaasReadinessPanel"
        export { routeMetaRequest, createLocalInviteCodeGate }
        export function renderSaasReadinessPanel() {
          return renderToStaticMarkup(React.createElement(SaasReadinessPanel))
        }
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "friends-beta-entry.ts",
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

function route(module, method, path, body, dependencies = {}) {
  return module.routeMetaRequest(
    { method, url: new URL(path, "http://127.0.0.1:8787"), body },
    {},
    dependencies,
  )
}

function parse(response) {
  return JSON.parse(response.body)
}

async function verifyFriendsBetaReadiness(module) {
  const response = await route(module, "GET", "/app/readiness", {})
  const body = parse(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.productionReady, false)
  assert.equal(body.friendsBetaCandidate, true)
  assert.equal(body.friendsBeta.mode, "friends-beta")
  assert.equal(body.friendsBeta.publicSaasReady, false)
  assert.deepEqual(body.friendsBeta.blockers, [])
  assert.equal(body.safety.sendsMessages, false)
  assert.equal(body.safety.createsWebhookSubscriptions, false)
  assert.equal(body.safety.acceptsPayments, false)
  assert.equal(body.safety.exposesTokenValues, false)
  assert.equal(body.outboundAutomationLimits.autoSendEnabled, false)
  assert.equal(body.outboundAutomationLimits.batchSendsAllowed, false)
  assert.deepEqual(body.outboundAutomationLimits.windows.map((window) => [window.windowSeconds, window.maxActions]), [
    [60, 1],
    [300, 3],
    [600, 5],
    [1800, 10],
    [3600, 15],
  ])
}

async function verifyInviteValidation(module) {
  const inviteCode = "FRIENDS-BETA-LOCAL"
  const gate = module.createLocalInviteCodeGate([inviteCode])
  const accepted = await route(
    module,
    "POST",
    "/friends-beta/invite/validate",
    { inviteCode, friendLabel: "민지" },
    { saas: { inviteCodeGate: gate } },
  )
  const acceptedBody = parse(accepted)

  assert.equal(accepted.statusCode, 200)
  assert.equal(acceptedBody.ok, true)
  assert.equal(acceptedBody.invite.accepted, true)
  assert.equal(acceptedBody.invite.authCreated, false)
  assert.equal(acceptedBody.invite.codePreview, "FRI...OCAL")
  assert.equal(accepted.body.includes(inviteCode), false)
  assert.equal(accepted.body.includes("민지"), false)

  const rejected = await route(
    module,
    "POST",
    "/friends-beta/invite/validate",
    { inviteCode: "WRONG-CODE", friendLabel: "민지" },
    { saas: { inviteCodeGate: gate } },
  )
  const rejectedBody = parse(rejected)

  assert.equal(rejected.statusCode, 403)
  assert.equal(rejectedBody.ok, false)
  assert.equal(rejectedBody.invite.accepted, false)
  assert.equal(rejectedBody.invite.codePreview, "WRO...CODE")
  assert.equal(rejected.body.includes("WRONG-CODE"), false)
  assert.equal(rejected.body.includes("민지"), false)
}

function verifyPanelCopy(module) {
  const html = module.renderSaasReadinessPanel()

  assert.equal(html.includes("지인 베타 모드"), true)
  assert.equal(html.includes("Friends beta candidate, not public SaaS"), true)
  assert.equal(html.includes("Cheapest next path: one Cloud Run service plus a manual admin invite code"), true)
  assert.equal(html.includes("3-5 trusted testers only"), true)
  assert.equal(html.includes("Anti-lock throttle"), true)
  assert.equal(html.includes("1/min"), true)
}

const { module, tempDir } = await loadRouteModule()
try {
  await verifyFriendsBetaReadiness(module)
  await verifyInviteValidation(module)
  verifyPanelCopy(module)
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("friends-beta-smoke-check: readiness flags and invite gate passed")
