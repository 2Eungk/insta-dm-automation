export type OutboundWindowLimit = {
  readonly windowSeconds: number
  readonly maxActions: number
  readonly label: string
}

export type OutboundAutomationLimitPolicy = {
  readonly mode: "approval-only-throttled"
  readonly sendsMessages: false
  readonly autoSendEnabled: false
  readonly minSecondsBetweenActions: number
  readonly windows: readonly OutboundWindowLimit[]
  readonly batchSendsAllowed: false
  readonly perRecipientCooldownSeconds: number
  readonly stopOnPlatformWarning: true
}

export type OutboundActionAttempt = {
  readonly at: string
  readonly recipientId: string
}

export type OutboundLimitDecision = {
  readonly allowed: boolean
  readonly reason: "ok" | "global-cooldown" | "window-limit" | "recipient-cooldown"
  readonly waitSeconds: number
  readonly matchedWindow?: OutboundWindowLimit
}

export const FRIENDS_BETA_OUTBOUND_LIMIT_POLICY: OutboundAutomationLimitPolicy = {
  mode: "approval-only-throttled",
  sendsMessages: false,
  autoSendEnabled: false,
  minSecondsBetweenActions: 45,
  windows: [
    { label: "1 minute", windowSeconds: 60, maxActions: 1 },
    { label: "5 minutes", windowSeconds: 300, maxActions: 3 },
    { label: "10 minutes", windowSeconds: 600, maxActions: 5 },
    { label: "30 minutes", windowSeconds: 1_800, maxActions: 10 },
    { label: "1 hour", windowSeconds: 3_600, maxActions: 15 },
  ],
  batchSendsAllowed: false,
  perRecipientCooldownSeconds: 3_600,
  stopOnPlatformWarning: true,
} as const

function secondsBetween(laterMs: number, earlierMs: number): number {
  return Math.max(0, Math.ceil((laterMs - earlierMs) / 1_000))
}

function waitForWindow(nowMs: number, oldestRelevantMs: number, windowSeconds: number): number {
  return Math.max(1, windowSeconds - secondsBetween(nowMs, oldestRelevantMs))
}

export function evaluateOutboundLimit(
  attempts: readonly OutboundActionAttempt[],
  nextAttempt: OutboundActionAttempt,
  policy: OutboundAutomationLimitPolicy = FRIENDS_BETA_OUTBOUND_LIMIT_POLICY,
): OutboundLimitDecision {
  const nowMs = Date.parse(nextAttempt.at)
  const validAttempts = attempts
    .map((attempt) => ({ ...attempt, atMs: Date.parse(attempt.at) }))
    .filter((attempt) => Number.isFinite(attempt.atMs) && attempt.atMs <= nowMs)
    .sort((left, right) => right.atMs - left.atMs)

  const latestAttempt = validAttempts[0]
  if (latestAttempt !== undefined) {
    const elapsed = secondsBetween(nowMs, latestAttempt.atMs)
    if (elapsed < policy.minSecondsBetweenActions) {
      return {
        allowed: false,
        reason: "global-cooldown",
        waitSeconds: policy.minSecondsBetweenActions - elapsed,
      }
    }
  }

  const latestRecipientAttempt = validAttempts.find((attempt) => attempt.recipientId === nextAttempt.recipientId)
  if (latestRecipientAttempt !== undefined) {
    const elapsed = secondsBetween(nowMs, latestRecipientAttempt.atMs)
    if (elapsed < policy.perRecipientCooldownSeconds) {
      return {
        allowed: false,
        reason: "recipient-cooldown",
        waitSeconds: policy.perRecipientCooldownSeconds - elapsed,
      }
    }
  }

  for (const window of policy.windows) {
    const windowStartMs = nowMs - window.windowSeconds * 1_000
    const attemptsInWindow = validAttempts.filter((attempt) => attempt.atMs > windowStartMs)
    if (attemptsInWindow.length >= window.maxActions) {
      const oldestCounted = attemptsInWindow.at(-1)
      return {
        allowed: false,
        reason: "window-limit",
        waitSeconds: oldestCounted === undefined ? window.windowSeconds : waitForWindow(nowMs, oldestCounted.atMs, window.windowSeconds),
        matchedWindow: window,
      }
    }
  }

  return { allowed: true, reason: "ok", waitSeconds: 0 }
}
