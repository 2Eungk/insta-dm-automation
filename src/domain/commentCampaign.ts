import type { InstagramEvent } from "./types"

export const COMMENT_TARGET_MODES = ["keyword", "any-commenter"] as const
export const COMMENT_ACTION_MODES = ["public-reply-draft", "dm-draft", "public-reply-and-dm-draft"] as const

export type CommentTargetMode = (typeof COMMENT_TARGET_MODES)[number]
export type CommentActionMode = (typeof COMMENT_ACTION_MODES)[number]

export type CommentCampaignConfig = {
  readonly id: string
  readonly name: string
  readonly mediaId: string
  readonly postUrl: string
  readonly targetMode: CommentTargetMode
  readonly includeKeywords: readonly string[]
  readonly excludeKeywords: readonly string[]
  readonly actionMode: CommentActionMode
  readonly autoSendEnabled: false
  readonly approvalRequired: true
  readonly batchSendsAllowed: false
  readonly skipOwnerAndTeam: true
  readonly dedupeByCommentId: true
}

export type CommentCampaignRisk = "low" | "medium" | "high"

export type CommentCampaignSafety = {
  readonly risk: CommentCampaignRisk
  readonly warnings: readonly string[]
  readonly allowedForFriendsBeta: boolean
}

export const DEFAULT_COMMENT_CAMPAIGN_CONFIG: CommentCampaignConfig = {
  id: "friends-beta-comment-campaign",
  name: "게시글 댓글 캠페인",
  mediaId: "ig_media_1",
  postUrl: "https://www.instagram.com/p/POST_ID/",
  targetMode: "keyword",
  includeKeywords: ["가격", "구매", "링크", "예약", "신청"],
  excludeKeywords: ["광고", "부업", "맞팔", "욕설", "http://", "https://"],
  actionMode: "public-reply-and-dm-draft",
  autoSendEnabled: false,
  approvalRequired: true,
  batchSendsAllowed: false,
  skipOwnerAndTeam: true,
  dedupeByCommentId: true,
} as const

function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase()
}

function includesAnyKeyword(message: string, keywords: readonly string[]): boolean {
  const normalizedMessage = message.toLowerCase()
  return keywords.map(normalizeKeyword).filter((keyword) => keyword.length > 0).some((keyword) => normalizedMessage.includes(keyword))
}

export function commentMatchesCampaign(event: InstagramEvent, campaign: CommentCampaignConfig): boolean {
  if (event.channel !== "comment") {
    return false
  }
  if (event.mediaId !== undefined && event.mediaId !== campaign.mediaId) {
    return false
  }
  if (includesAnyKeyword(event.message, campaign.excludeKeywords)) {
    return false
  }
  if (campaign.targetMode === "any-commenter") {
    return true
  }
  return includesAnyKeyword(event.message, campaign.includeKeywords)
}

export function assessCommentCampaignSafety(campaign: CommentCampaignConfig): CommentCampaignSafety {
  const warnings: string[] = []
  if (campaign.targetMode === "any-commenter") {
    warnings.push("모든 댓글 작성자 대상은 스팸/계정 제한 위험이 높아서 DM은 반드시 승인형으로만 처리해야 합니다.")
  }
  if (campaign.actionMode === "public-reply-and-dm-draft") {
    warnings.push("공개 답글과 DM을 둘 다 만들면 반복 문구/과접촉 위험이 커져 제한 정책과 중복 처리 방지가 필요합니다.")
  }
  if (campaign.includeKeywords.length === 0 && campaign.targetMode === "keyword") {
    warnings.push("키워드 모드에는 최소 1개 이상의 포함 키워드가 필요합니다.")
  }
  if (campaign.autoSendEnabled) {
    warnings.push("자동 발송은 지인 베타에서 허용하지 않습니다.")
  }
  if (campaign.batchSendsAllowed) {
    warnings.push("일괄 발송은 지인 베타에서 허용하지 않습니다.")
  }

  const risk: CommentCampaignRisk = campaign.targetMode === "any-commenter" || campaign.actionMode === "public-reply-and-dm-draft" ? "high" : "medium"
  const allowedForFriendsBeta = campaign.autoSendEnabled === false && campaign.approvalRequired === true && campaign.batchSendsAllowed === false

  return { risk, warnings, allowedForFriendsBeta }
}

export function actionModeLabel(actionMode: CommentActionMode): string {
  switch (actionMode) {
    case "public-reply-draft":
      return "공개 답글 초안"
    case "dm-draft":
      return "DM 초안"
    case "public-reply-and-dm-draft":
      return "공개 답글 + DM 초안"
  }
}

export function targetModeLabel(targetMode: CommentTargetMode): string {
  switch (targetMode) {
    case "keyword":
      return "키워드 포함 댓글만"
    case "any-commenter":
      return "댓글 단 사람 전체"
  }
}
