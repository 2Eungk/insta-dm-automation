export type ReadinessSafety = {
  readonly sendsMessages: boolean
  readonly createsWebhookSubscriptions: boolean
  readonly acceptsPayments: boolean
  readonly persistsRawMetaPayloads: boolean
  readonly exposesTokenValues: boolean
}

export type FriendsBetaReadiness = {
  readonly mode: "friends-beta"
  readonly candidate: boolean
  readonly publicSaasReady: false
  readonly blockers: readonly string[]
  readonly testerLimit: "3-5 trusted testers"
  readonly onboarding: "manual admin invite"
  readonly sendPolicy: "read-only or approval-only"
  readonly authModel: "local invite code stub"
}

export function evaluateFriendsBetaReadiness(safety: ReadinessSafety): FriendsBetaReadiness {
  const blockers = [
    safety.sendsMessages ? "message sending must remain disabled" : "",
    safety.createsWebhookSubscriptions ? "webhook subscription creation must remain disabled" : "",
    safety.acceptsPayments ? "payments must remain disabled" : "",
    safety.persistsRawMetaPayloads ? "raw Meta payload persistence must remain disabled" : "",
    safety.exposesTokenValues ? "token values must never be exposed" : "",
  ].filter((blocker) => blocker.length > 0)

  return {
    mode: "friends-beta",
    candidate: blockers.length === 0,
    publicSaasReady: false,
    blockers,
    testerLimit: "3-5 trusted testers",
    onboarding: "manual admin invite",
    sendPolicy: "read-only or approval-only",
    authModel: "local invite code stub",
  }
}
