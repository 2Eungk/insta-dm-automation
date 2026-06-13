import type { AuditLog } from "./saasTypes"

const SENSITIVE_KEYS = new Set(["access_token", "token", "client_secret", "authorization", "raw_payload", "message", "text"])

export function redactAuditMetadata(
  metadata: Readonly<Record<string, string | number | boolean>>,
): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, SENSITIVE_KEYS.has(key.toLowerCase()) ? "[redacted]" : value]),
  )
}

export function createAuditLog(input: Omit<AuditLog, "metadata"> & { readonly metadata: Readonly<Record<string, string | number | boolean>> }): AuditLog {
  return {
    ...input,
    metadata: redactAuditMetadata(input.metadata),
  }
}
