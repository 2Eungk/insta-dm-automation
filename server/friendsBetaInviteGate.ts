export type InviteValidationInput = {
  readonly inviteCode: string
  readonly friendLabel?: string
}

export type InviteValidationResult = {
  readonly accepted: boolean
  readonly mode: "friends-beta"
  readonly authCreated: false
  readonly codePreview: string
  readonly reason: "accepted-local-stub" | "invalid-invite-code"
}

export type InviteCodeGate = {
  readonly validate: (input: InviteValidationInput) => Promise<InviteValidationResult>
}

export const DEFAULT_LOCAL_INVITE_CODES = ["FRIENDS-BETA-LOCAL"] as const

export function redactInviteCode(inviteCode: string): string {
  const normalized = inviteCode.trim()
  if (normalized.length < 8) {
    return "[redacted]"
  }

  return `${normalized.slice(0, 3)}...${normalized.slice(-4)}`
}

export function createLocalInviteCodeGate(allowedCodes: readonly string[] = DEFAULT_LOCAL_INVITE_CODES): InviteCodeGate {
  const normalizedAllowedCodes = new Set(allowedCodes.map((code) => code.trim()).filter((code) => code.length > 0))

  return {
    async validate(input) {
      const normalizedInviteCode = input.inviteCode.trim()
      const accepted = normalizedAllowedCodes.has(normalizedInviteCode)
      return {
        accepted,
        mode: "friends-beta",
        authCreated: false,
        codePreview: redactInviteCode(normalizedInviteCode),
        reason: accepted ? "accepted-local-stub" : "invalid-invite-code",
      }
    },
  }
}
