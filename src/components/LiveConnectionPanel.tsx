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
      return "OK"
    case "permission-required":
      return "Permission required"
    case "not-available":
      return "Not available"
    case "setup-required":
      return "Setup required"
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
    return <p className="liveEmpty">No live preview rows are available from the current read-only diagnostics.</p>
  }

  return (
    <div className="livePreviewLists">
      {diagnostics.preview.conversations.map((conversation) => (
        <article key={conversation.id}>
          <span>Conversation</span>
          <strong>{conversation.id}</strong>
          <p>{conversation.updatedTime ?? "No updated time returned"}</p>
        </article>
      ))}
      {diagnostics.preview.messages.map((message) => (
        <article key={message.id}>
          <span>Message</span>
          <strong>{message.id}</strong>
          <p>{message.textPresent ? "Text present" : "No text field returned"}</p>
          <em>{message.from ?? message.createdTime ?? "Sender not returned"}</em>
        </article>
      ))}
      {diagnostics.preview.comments.map((comment) => (
        <article key={comment.commentId}>
          <span>Comment</span>
          <strong>{comment.commentId}</strong>
          <p>{comment.textPresent ? "Text present" : "No text field returned"}</p>
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
        setError("The local Meta server returned an unexpected diagnostics response.")
        setDiagnostics(null)
        return
      }
      setDiagnostics(parsed.data)
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError("Start the local Meta server on 127.0.0.1:8787 to run read-only live diagnostics.")
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
          <p className="eyebrow">Optional live read check</p>
          <h2 id="live-connection-title">Instagram live inbox diagnostics</h2>
          <p>Mock inbox remains primary. This panel only checks local read-only Meta access.</p>
        </div>
        <button aria-pressed={isEnabled} onClick={toggleLiveDiagnostics} type="button">
          {isEnabled ? "Live diagnostics on" : "Live diagnostics off"}
        </button>
      </header>

      {!isEnabled ? (
        <p className="liveEmpty">Enable the panel to call the local server. No browser action sends messages or creates webhook subscriptions.</p>
      ) : (
        <div className="liveDiagnosticsBody">
          <div className="liveAccountStrip">
            <article>
              <span>Account</span>
              <strong>{diagnostics?.account.data?.username ?? "Not connected"}</strong>
            </article>
            <article>
              <span>Token</span>
              <strong>{diagnostics === null ? "Unchecked" : statusLabel(diagnostics.token.status)}</strong>
              <p>{diagnostics === null ? "No value exposed" : `${diagnostics.token.source} token, value hidden`}</p>
            </article>
            <article>
              <span>Capabilities</span>
              <strong>
                {capabilityCounts.ok} ok / {capabilityCounts.blocked} blocked
              </strong>
            </article>
            <button disabled={isLoading} onClick={refreshDiagnostics} type="button">
              {isLoading ? "Checking" : "Refresh"}
            </button>
          </div>

          {error === null ? null : <p className="liveError">{error}</p>}

          {diagnostics === null ? null : (
            <>
              <div className="liveCapabilityGrid">
                <CapabilityRow capability={diagnostics.account} label="Account username" />
                <CapabilityRow capability={diagnostics.capabilities.conversations} label="Conversations" />
                <CapabilityRow capability={diagnostics.capabilities.messages} label="Messages" />
                <CapabilityRow capability={diagnostics.capabilities.comments} label="Comments" />
              </div>
              <PreviewList diagnostics={diagnostics} />
            </>
          )}
        </div>
      )}
    </section>
  )
}
