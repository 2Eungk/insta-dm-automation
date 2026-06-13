import { z } from "zod"

export type CapabilityStatus = "ok" | "permission-required" | "not-available" | "setup-required"

export type SanitizedMetaError = {
  readonly code: string | number | "not-provided"
  readonly message: string
}

export type CapabilityResult<T> = {
  readonly status: CapabilityStatus
  readonly message: string
  readonly metaError?: SanitizedMetaError
  readonly data?: T
}

export type ConversationPreview = {
  readonly id: string
  readonly updatedTime: string | undefined
}

export type MessagePreview = {
  readonly id: string
  readonly createdTime: string | undefined
  readonly from: string | undefined
  readonly textPresent: boolean
}

export type CommentPreview = {
  readonly mediaId: string
  readonly commentId: string
  readonly username: string | undefined
  readonly textPresent: boolean
  readonly timestamp: string | undefined
}

const PERMISSION_ERROR_CODES = new Set(["10", "200", "230", "400", "613"])
const TOKEN_ERROR_CODES = new Set(["190", "102", "104"])
const MAX_PREVIEW_ITEMS = 5

const metaErrorSchema = z
  .object({
    error: z
      .object({
        code: z.union([z.string(), z.number()]).optional(),
        message: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough()

const accountSchema = z
  .object({
    username: z.string().optional(),
    name: z.string().optional(),
    id: z.union([z.string(), z.number()]).optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough()

const conversationsSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string(),
            updated_time: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()

const messagesSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string(),
            created_time: z.string().optional(),
            from: z.object({ username: z.string().optional(), name: z.string().optional() }).passthrough().optional(),
            message: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()

const mediaSchema = z
  .object({
    data: z
      .array(
        z
          .object({
            id: z.string(),
            comments: z
              .object({
                data: z
                  .array(
                    z
                      .object({
                        id: z.string(),
                        text: z.string().optional(),
                        username: z.string().optional(),
                        timestamp: z.string().optional(),
                      })
                      .passthrough(),
                  )
                  .optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough()

export function sanitizeMessage(message: string | undefined, secrets: readonly string[]): string {
  const fallback = "Meta returned an error for this read-only diagnostic request."
  if (message === undefined || message.trim().length === 0) {
    return fallback
  }
  return secrets.reduce((sanitized, secret) => sanitized.replaceAll(secret, "[redacted]"), message)
}

export function sanitizeMetaError(payload: unknown, secrets: readonly string[]): SanitizedMetaError {
  const parsed = metaErrorSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      code: "not-provided",
      message: "Meta returned an error response that did not match the expected shape.",
    }
  }
  return {
    code: parsed.data.error.code ?? "not-provided",
    message: sanitizeMessage(parsed.data.error.message, secrets),
  }
}

export function classifyMetaError(status: number, metaError: SanitizedMetaError): CapabilityStatus {
  const code = String(metaError.code)
  if (TOKEN_ERROR_CODES.has(code)) {
    return "setup-required"
  }
  if (status === 403 || PERMISSION_ERROR_CODES.has(code)) {
    return "permission-required"
  }
  return "not-available"
}

export function accountResult(payload: unknown): CapabilityResult<{ readonly username: string }> {
  const parsed = accountSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      status: "not-available",
      message: "Meta returned an account response that did not match the expected read-only shape.",
    }
  }
  return {
    status: "ok",
    message: "Read-only account identity is available.",
    data: { username: parsed.data.username ?? parsed.data.name ?? "not-provided" },
  }
}

export function conversationsResult(payload: unknown): CapabilityResult<readonly ConversationPreview[]> {
  const parsed = conversationsSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      status: "not-available",
      message: "Meta returned a conversations response that did not match the expected read-only shape.",
    }
  }
  return {
    status: "ok",
    message: "Read-only Instagram conversation listing is available.",
    data: (parsed.data.data ?? []).slice(0, MAX_PREVIEW_ITEMS).map((conversation) => ({
      id: conversation.id,
      updatedTime: conversation.updated_time,
    })),
  }
}

export function messagesResult(payload: unknown): CapabilityResult<readonly MessagePreview[]> {
  const parsed = messagesSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      status: "not-available",
      message: "Meta returned a messages response that did not match the expected read-only shape.",
    }
  }
  return {
    status: "ok",
    message: "Read-only message preview is available for one conversation.",
    data: (parsed.data.data ?? []).slice(0, MAX_PREVIEW_ITEMS).map((message) => ({
      id: message.id,
      createdTime: message.created_time,
      from: message.from?.username ?? message.from?.name,
      textPresent: message.message !== undefined && message.message.length > 0,
    })),
  }
}

export function commentsResult(payload: unknown): CapabilityResult<readonly CommentPreview[]> {
  const parsed = mediaSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      status: "not-available",
      message: "Meta returned a media/comments response that did not match the expected read-only shape.",
    }
  }

  const comments = (parsed.data.data ?? []).flatMap((media) =>
    (media.comments?.data ?? []).map((comment) => ({
      mediaId: media.id,
      commentId: comment.id,
      username: comment.username,
      textPresent: comment.text !== undefined && comment.text.length > 0,
      timestamp: comment.timestamp,
    })),
  )

  return {
    status: "ok",
    message: "Read-only comment preview is available through media comments.",
    data: comments.slice(0, MAX_PREVIEW_ITEMS),
  }
}

export function setupCapability(message: string): CapabilityResult<readonly never[]> {
  return { status: "setup-required", message, data: [] }
}

export function unavailableCapability(message: string): CapabilityResult<readonly never[]> {
  return { status: "not-available", message, data: [] }
}
