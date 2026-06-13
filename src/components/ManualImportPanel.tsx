import { useMemo, useState } from "react"
import { CLASSIFICATION_LABELS } from "../domain/labels"
import { buildManualImportReviewRows } from "../domain/manualImport"
import type { ReplyTone } from "../domain/types"

const EXAMPLE_TEXT = `민서 | @minseo.daily | comment | 원데이 클래스 다음 주 토요일 2명 예약 가능할까요?
도윤 | @doyoon_88 | dm | 여름 니트 가격이랑 구매 링크 주세요
광고계정 | @spam_now | comment | 팔로워 증가 무료 체험 http://spam.example`

export function ManualImportPanel(): React.JSX.Element {
  const [inputText, setInputText] = useState(EXAMPLE_TEXT)
  const [replyTone, setReplyTone] = useState<ReplyTone>("friendly")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const rows = useMemo(() => buildManualImportReviewRows(inputText, replyTone), [inputText, replyTone])

  async function copyDraft(eventId: string, draft: string): Promise<void> {
    await navigator.clipboard?.writeText(draft)
    setCopiedId(eventId)
  }

  return (
    <section className="manualImportPanel" aria-labelledby="manual-import-title">
      <header>
        <div>
          <p className="eyebrow">WORKING MODE</p>
          <h2 id="manual-import-title">실전 붙여넣기</h2>
          <p>
            여기에 실제 DM/댓글을 붙여넣으면 브라우저 안에서 바로 분류·초안 생성까지 작동합니다. 자동발송 없음,
            서버 업로드 없음, 각자 브라우저에서만 처리합니다.
          </p>
        </div>
        <span>{rows.length}건 분류·초안 생성</span>
      </header>

      <div className="manualImportControls">
        <label>
          <span>붙여넣기 형식</span>
          <textarea
            aria-label="실제 DM 또는 댓글 붙여넣기"
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            rows={5}
            spellCheck={false}
          />
        </label>
        <aside>
          <strong>형식</strong>
          <code>이름 | @핸들 | dm/comment | 메시지</code>
          <p>쉼표 구분도 가능하지만, 메시지에 쉼표가 많으면 | 구분을 권장합니다.</p>
          <label>
            <span>답장 톤</span>
            <select value={replyTone} onChange={(event) => setReplyTone(event.target.value as ReplyTone)}>
              <option value="friendly">친절한</option>
              <option value="concise">간결한</option>
              <option value="professional">전문적인</option>
              <option value="casual">캐주얼</option>
            </select>
          </label>
        </aside>
      </div>

      <div className="manualImportResults" aria-label="수동 붙여넣기 초안 결과">
        {rows.length === 0 ? (
          <p>아직 변환 가능한 줄이 없습니다. 예: 이름 | @handle | dm | 문의 내용</p>
        ) : (
          rows.map((row) => (
            <article key={row.event.id}>
              <div>
                <strong>{row.event.senderName}</strong>
                <span>{row.event.senderHandle} · {row.event.channel.toUpperCase()}</span>
              </div>
              <p>{row.event.message}</p>
              <small>{CLASSIFICATION_LABELS[row.analysis.classification]} · {Math.round(row.analysis.confidence * 100)}% · {row.source}</small>
              <blockquote>{row.draft}</blockquote>
              <div className="manualImportActions">
                <button type="button" onClick={() => void copyDraft(row.event.id, row.draft)}>
                  {copiedId === row.event.id ? "복사됨" : "초안 복사"}
                </button>
                <button type="button">승인 표시</button>
                <button type="button">보류</button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
