import { useCallback, useMemo, useState } from "react"
import { z } from "zod"

const capabilityStatusSchema = z.enum(["ok", "permission-required", "not-available", "setup-required"])

const capabilitySchema = z.object({
  status: capabilityStatusSchema,
  message: z.string(),
  metaError: z
    .object({
      code: z.union([z.string(), z.number(), z.literal("not-provided")]),
      message: z.string(),
    })
    .optional(),
})

const liveDiagnosticsSchema = z.object({
  ok: z.literal(true),
  mode: z.literal("read-only-live-preview"),
  token: z.object({
    status: capabilityStatusSchema,
    source: z.enum(["long-lived", "short-lived", "missing"]),
    preferredEnv: z.literal("META_LONG_LIVED_ACCESS_TOKEN"),
    fallbackEnv: z.literal("META_ACCESS_TOKEN"),
    present: z.boolean(),
    valueExposed: z.literal(false),
  }),
  account: capabilitySchema.extend({
    data: z.object({ username: z.string() }).optional(),
  }),
  capabilities: z.object({
    conversations: capabilitySchema,
    messages: capabilitySchema,
    comments: capabilitySchema,
  }),
  preview: z.object({
    conversations: z.array(z.object({ id: z.string(), updatedTime: z.string().optional() })),
    messages: z.array(
      z.object({
        id: z.string(),
        createdTime: z.string().optional(),
        from: z.string().optional(),
        textPresent: z.boolean(),
      }),
    ),
    comments: z.array(
      z.object({
        mediaId: z.string(),
        commentId: z.string(),
        username: z.string().optional(),
        textPresent: z.boolean(),
        timestamp: z.string().optional(),
      }),
    ),
  }),
})

type CapabilityStatus = z.infer<typeof capabilityStatusSchema>
type Capability = z.infer<typeof capabilitySchema>
type LiveDiagnostics = z.infer<typeof liveDiagnosticsSchema>

const LIVE_ENDPOINT = "http://127.0.0.1:8787/instagram/live-inbox"

function statusLabel(status: CapabilityStatus): string {
  switch (status) {
    case "ok":
      return "정상"
    case "permission-required":
      return "권한 필요"
    case "not-available":
      return "사용 불가"
    case "setup-required":
      return "설정 필요"
  }
}

function statusClassName(status: CapabilityStatus): string {
  return `liveStatus ${status}`
}

function CapabilityRow({ label, capability }: { readonly label: string; readonly capability: Capability }): React.JSX.Element {
  return (
    <article className="liveCapability">
      <div>
        <strong>{label}</strong>
        <span className={statusClassName(capability.status)}>{statusLabel(capability.status)}</span>
      </div>
      <p>{capability.message}</p>
      {capability.metaError === undefined ? null : (
        <code>
          Meta {String(capability.metaError.code)}: {capability.metaError.message}
        </code>
      )}
    </article>
  )
}

function PreviewList({ diagnostics }: { readonly diagnostics: LiveDiagnostics }): React.JSX.Element {
  const totalPreviewItems =
    diagnostics.preview.conversations.length + diagnostics.preview.messages.length + diagnostics.preview.comments.length

  if (totalPreviewItems === 0) {
    return <p className="liveEmpty">현재 읽기 전용 점검에서 미리보기 항목을 가져오지 못했습니다.</p>
  }

  return (
    <div className="livePreviewLists">
      {diagnostics.preview.conversations.map((conversation) => (
        <article key={conversation.id}>
          <span>대화</span>
          <strong>{conversation.id}</strong>
          <p>{conversation.updatedTime ?? "업데이트 시간이 없습니다"}</p>
        </article>
      ))}
      {diagnostics.preview.messages.map((message) => (
        <article key={message.id}>
          <span>메시지</span>
          <strong>{message.id}</strong>
          <p>{message.textPresent ? "본문 있음" : "본문 필드 없음"}</p>
          <em>{message.from ?? message.createdTime ?? "보낸 사람 없음"}</em>
        </article>
      ))}
      {diagnostics.preview.comments.map((comment) => (
        <article key={comment.commentId}>
          <span>댓글</span>
          <strong>{comment.commentId}</strong>
          <p>{comment.textPresent ? "본문 있음" : "본문 필드 없음"}</p>
          <em>{comment.username ?? comment.timestamp ?? comment.mediaId}</em>
        </article>
      ))}
    </div>
  )
}

export function LiveConnectionPanel(): React.JSX.Element {
  const [isEnabled, setIsEnabled] = useState(false)
  const [diagnostics, setDiagnostics] = useState<LiveDiagnostics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const capabilityCounts = useMemo(() => {
    if (diagnostics === null) {
      return { ok: 0, blocked: 0 }
    }
    const statuses = [
      diagnostics.account.status,
      diagnostics.capabilities.conversations.status,
      diagnostics.capabilities.messages.status,
      diagnostics.capabilities.comments.status,
    ]
    return {
      ok: statuses.filter((status) => status === "ok").length,
      blocked: statuses.filter((status) => status !== "ok").length,
    }
  }, [diagnostics])

  const runDiagnostics = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(LIVE_ENDPOINT, { method: "GET" })
      const payload: unknown = await response.json()
      const parsed = liveDiagnosticsSchema.safeParse(payload)
      if (!response.ok || !parsed.success) {
        setError("로컬 Meta 서버 응답 형식이 예상과 다릅니다.")
        setDiagnostics(null)
        return
      }
      setDiagnostics(parsed.data)
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError("읽기 전용 실계정 점검을 하려면 127.0.0.1:8787 로컬 Meta 서버를 먼저 켜야 합니다.")
        setDiagnostics(null)
        return
      }
      throw caughtError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const toggleLiveDiagnostics = (): void => {
    const next = !isEnabled
    setIsEnabled(next)
    if (next) {
      void runDiagnostics()
      return
    }
    setError(null)
  }

  const refreshDiagnostics = (): void => {
    if (!isEnabled) {
      return
    }
    void runDiagnostics()
  }

  return (
    <section className="liveConnectionPanel" aria-labelledby="live-connection-title">
      <header>
        <div>
          <p className="eyebrow">선택 점검</p>
          <h2 id="live-connection-title">Instagram 실계정 읽기 진단</h2>
          <p>기본은 목업 문의함입니다. 이 패널은 로컬 서버를 통한 읽기 전용 Meta 접근만 확인합니다.</p>
        </div>
        <button aria-pressed={isEnabled} onClick={toggleLiveDiagnostics} type="button">
          {isEnabled ? "실계정 점검 켜짐" : "실계정 점검 꺼짐"}
        </button>
      </header>

      {!isEnabled ? (
        <p className="liveEmpty">패널을 켜면 로컬 서버만 호출합니다. 브라우저에서 메시지를 보내거나 웹훅을 만들지 않습니다.</p>
      ) : (
        <div className="liveDiagnosticsBody">
          <div className="liveAccountStrip">
            <article>
              <span>계정</span>
              <strong>{diagnostics?.account.data?.username ?? "연결 안 됨"}</strong>
            </article>
            <article>
              <span>토큰</span>
              <strong>{diagnostics === null ? "미확인" : statusLabel(diagnostics.token.status)}</strong>
              <p>{diagnostics === null ? "값 노출 없음" : `${diagnostics.token.source} 토큰, 값 숨김`}</p>
            </article>
            <article>
              <span>권한 상태</span>
              <strong>
                정상 {capabilityCounts.ok} / 막힘 {capabilityCounts.blocked}
              </strong>
            </article>
            <button disabled={isLoading} onClick={refreshDiagnostics} type="button">
              {isLoading ? "확인 중" : "새로고침"}
            </button>
          </div>

          {error === null ? null : <p className="liveError">{error}</p>}

          {diagnostics === null ? null : (
            <>
              <div className="liveCapabilityGrid">
                <CapabilityRow capability={diagnostics.account} label="계정 사용자명" />
                <CapabilityRow capability={diagnostics.capabilities.conversations} label="대화 목록" />
                <CapabilityRow capability={diagnostics.capabilities.messages} label="메시지" />
                <CapabilityRow capability={diagnostics.capabilities.comments} label="댓글" />
              </div>
              <PreviewList diagnostics={diagnostics} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
