import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function loadModule() {
  const tempDir = await mkdtemp(join(process.cwd(), ".comment-campaign-smoke-"))
  const outputFile = join(tempDir, "comment-campaign-entry.mjs")
  await build({
    stdin: {
      contents: `
        import React from "react"
        import { renderToStaticMarkup } from "react-dom/server"
        import { DEFAULT_COMMENT_CAMPAIGN_CONFIG, assessCommentCampaignSafety, buildCommentCampaignDraftQueue, commentMatchesCampaign } from "./src/domain/commentCampaign"
        import { normalizeMockMetaWebhookPayload } from "./src/domain/metaReadiness"
        import { CommentCampaignPanel } from "./src/components/CommentCampaignPanel"
        import { routeMetaRequest } from "./server/routes"
        export { DEFAULT_COMMENT_CAMPAIGN_CONFIG, assessCommentCampaignSafety, buildCommentCampaignDraftQueue, commentMatchesCampaign, normalizeMockMetaWebhookPayload, routeMetaRequest }
        export function renderCommentCampaignPanel() {
          return renderToStaticMarkup(React.createElement(CommentCampaignPanel))
        }
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "comment-campaign-entry.ts",
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
  const campaign = module.DEFAULT_COMMENT_CAMPAIGN_CONFIG
  const safety = module.assessCommentCampaignSafety(campaign)
  assert.equal(campaign.targetMode, "keyword")
  assert.equal(campaign.actionMode, "public-reply-and-dm-draft")
  assert.equal(campaign.autoSendEnabled, false)
  assert.equal(campaign.batchSendsAllowed, false)
  assert.equal(campaign.approvalRequired, true)
  assert.equal(safety.allowedForFriendsBeta, true)
  assert.equal(safety.risk, "high")

  const payload = {
    object: "instagram",
    entry: [{
      time: 1770000000,
      changes: [
        { field: "comments", value: { comment_id: "comment-1", text: "가격 링크 주세요", media: { id: "ig_media_1" }, from: { username: "buyer" } } },
        { field: "comments", value: { comment_id: "comment-2", text: "광고 문의", media: { id: "ig_media_1" }, from: { username: "spam" } } },
        { field: "comments", value: { comment_id: "comment-3", text: "가격 알려주세요", media: { id: "other_media" }, from: { username: "other" } } },
      ],
    }],
  }
  const normalized = module.normalizeMockMetaWebhookPayload(payload, "campaign-fixture")
  assert.equal(normalized.events[0].mediaId, "ig_media_1")
  assert.equal(normalized.events[0].commentId, "comment-1")
  assert.equal(module.commentMatchesCampaign(normalized.events[0], campaign), true)
  assert.equal(module.commentMatchesCampaign(normalized.events[1], campaign), false)
  assert.equal(module.commentMatchesCampaign(normalized.events[2], campaign), false)

  const allCommentersCampaign = { ...campaign, targetMode: "any-commenter", includeKeywords: [] }
  assert.equal(module.commentMatchesCampaign({ ...normalized.events[0], message: "좋아요" }, allCommentersCampaign), true)

  const queue = module.buildCommentCampaignDraftQueue(normalized.events, campaign)
  assert.equal(queue.length, 1)
  assert.equal(queue[0].event.id, "comment-1")
  assert.equal(queue[0].status, "needs-approval")
  assert.equal(queue[0].channels.includes("public-reply"), true)
  assert.equal(queue[0].channels.includes("dm"), true)
  assert.equal(queue[0].publicReplyDraft.includes("DM으로 안내드릴게요"), true)
  assert.equal(queue[0].dmDraft.includes("가격 링크"), true)
  assert.equal(queue[0].dedupeKey, "ig_media_1:comment-1")
  assert.equal(queue[0].safetyNote.includes("자동 발송하지 않음"), true)

  const readiness = JSON.parse((await module.routeMetaRequest({ method: "GET", url: new URL("/app/readiness", "http://127.0.0.1:8787"), body: {} }, {})).body)
  assert.equal(readiness.commentCampaign.enabled, true)
  assert.equal(readiness.commentCampaign.config.actionMode, "public-reply-and-dm-draft")
  assert.equal(readiness.commentCampaign.safety.allowedForFriendsBeta, true)

  const html = module.renderCommentCampaignPanel()
  assert.equal(html.includes("게시글 댓글 캠페인"), true)
  assert.equal(html.includes("키워드 1개만 등록 가능"), true)
  assert.equal(html.includes("공개 답글 + DM 초안"), true)
  assert.equal(html.includes("댓글 초안 큐"), true)
  assert.equal(html.includes("승인 대기"), true)
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("comment-campaign-smoke-check: target modes, media filtering, reply/DM draft settings passed")
