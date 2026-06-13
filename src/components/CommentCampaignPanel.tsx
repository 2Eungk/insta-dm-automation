import { useState } from "react"
import {
  DEFAULT_COMMENT_CAMPAIGN_CONFIG,
  actionModeLabel,
  applyCommentCampaignDecision,
  assessCommentCampaignSafety,
  buildCommentCampaignDraftQueue,
  targetModeLabel,
  type CommentCampaignDecisionMap,
  type CommentCampaignDecisionStatus,
} from "../domain/commentCampaign"
import { MOCK_EVENTS } from "../data/mockEvents"

const campaign = DEFAULT_COMMENT_CAMPAIGN_CONFIG
const safety = assessCommentCampaignSafety(campaign)
const draftQueue = buildCommentCampaignDraftQueue(MOCK_EVENTS, campaign)

export function CommentCampaignPanel(): React.JSX.Element {
  const [decisions, setDecisions] = useState<CommentCampaignDecisionMap>({})

  function decideQueueItem(dedupeKey: string, status: CommentCampaignDecisionStatus): void {
    setDecisions((currentDecisions) => applyCommentCampaignDecision(currentDecisions, dedupeKey, status))
  }

  return (
    <section className="commentCampaignPanel" aria-labelledby="comment-campaign-title">
      <header>
        <div>
          <p className="eyebrow">게시글 댓글 캠페인</p>
          <h2 id="comment-campaign-title">특정 글 댓글 → 답글/DM 초안</h2>
          <p>
            게시글 URL 또는 mediaId를 기준으로 댓글을 모으고, 키워드 포함 댓글 또는 댓글 작성자 전체를 대상으로
            공개 답글·DM 초안을 만듭니다. 실제 발송은 아직 없고 사람 승인 전제로만 설계됩니다.
          </p>
        </div>
        <span>{safety.allowedForFriendsBeta ? "Approval-only" : "Blocked"}</span>
      </header>

      <div className="commentCampaignGrid">
        <article>
          <strong>게시글 대상</strong>
          <code>{campaign.postUrl}</code>
          <p>저장값은 mediaId <b>{campaign.mediaId}</b> 기준으로 매칭합니다.</p>
        </article>
        <article>
          <strong>대상 댓글</strong>
          <p>{targetModeLabel(campaign.targetMode)}</p>
          <div className="keywordPills">
            {campaign.includeKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
          </div>
        </article>
        <article>
          <strong>제외 조건</strong>
          <div className="keywordPills danger">
            {campaign.excludeKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
          </div>
        </article>
        <article>
          <strong>동작</strong>
          <p>{actionModeLabel(campaign.actionMode)}</p>
          <p>자동발송 OFF · 일괄발송 OFF · 승인 필수</p>
        </article>
      </div>

      <div className="commentCampaignSafety">
        <section>
          <h3>설정 가능 범위</h3>
          <ul>
            <li>키워드 1개만 등록 가능</li>
            <li>여러 키워드 중 하나라도 포함되면 대상 가능</li>
            <li>댓글 단 사람 전체 대상 가능 — 단, 위험 모드로 표시</li>
            <li>공개 답글만 / DM만 / 공개 답글 + DM 초안 모두 가능</li>
          </ul>
        </section>
        <section>
          <h3>안전 경고</h3>
          <p>위험도: {safety.risk}</p>
          {safety.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </section>
      </div>

      <section className="commentCampaignQueue" aria-label="댓글 캠페인 초안 큐">
        <header>
          <div>
            <h3>댓글 초안 큐</h3>
            <p>매칭된 댓글을 공개 답글/DM 초안으로 연결하고, 발송 전 승인 대기로 고정합니다. 승인해도 실제 전송 아님 상태로 기록합니다.</p>
          </div>
          <span>{draftQueue.length}건 승인 대기</span>
        </header>
        {draftQueue.length === 0 ? (
          <p>현재 샘플에서 조건에 맞는 댓글이 없습니다.</p>
        ) : (
          <div className="commentCampaignQueueList">
            {draftQueue.map((item) => {
              const decision = decisions[item.dedupeKey]
              const statusLabel = decision?.status === "approved" ? "승인됨 · 실제 전송 아님" : decision?.status === "hold" ? "보류됨" : "승인 대기"
              return (
                <article key={item.dedupeKey}>
                  <div>
                    <strong>{item.event.senderName}</strong>
                    <span>{item.event.senderHandle}</span>
                  </div>
                  <p>{item.event.message}</p>
                  <small>{item.channels.join(" + ")} · {statusLabel} · {decision?.auditSummary ?? item.safetyNote}</small>
                  {item.publicReplyDraft === null ? null : <blockquote>{item.publicReplyDraft}</blockquote>}
                  {item.dmDraft === null ? null : <blockquote>{item.dmDraft}</blockquote>}
                  <div className="commentCampaignActions" aria-label={`${item.event.senderName} 댓글 캠페인 결정`}>
                    <button type="button" onClick={() => decideQueueItem(item.dedupeKey, "approved")}>초안 승인</button>
                    <button type="button" onClick={() => decideQueueItem(item.dedupeKey, "hold")}>보류</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}
