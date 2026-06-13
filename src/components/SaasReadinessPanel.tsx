const costChecklist = [
  "Managed Postgres/Supabase for tenant data and audit logs",
  "Hosted web/runtime plan with spend caps and log retention",
  "Production secret manager or KMS for Meta tokens",
  "Meta app review, business verification, and support process",
] as const

const deploymentGates = [
  "No real sends until approval events and rate limits are enforced",
  "No webhook subscriptions until replay, dedupe, and deletion policies are tested",
  "No payments until workspace limits, cancellation, and support paths exist",
] as const

export function SaasReadinessPanel(): React.JSX.Element {
  return (
    <section className="saasReadinessPanel" aria-labelledby="saas-readiness-title">
      <header>
        <div>
          <p className="eyebrow">SaaS readiness</p>
          <h2 id="saas-readiness-title">Server foundation and production gates</h2>
          <p>Local backend scaffold is allowed. Production deployment, paid services, real webhook subscriptions, and message sending are still gated.</p>
        </div>
        <span>Local only</span>
      </header>

      <div className="saasReadinessGrid">
        <article>
          <strong>Local dev boundary</strong>
          <p>Uses in-memory or local JSON persistence behind interfaces. DEV_ENCRYPTION_KEY is a placeholder for offline encryption tests only.</p>
        </article>
        <article>
          <strong>Production replacement</strong>
          <p>Swap storage for Postgres/Supabase, move token encryption to KMS, add tenant-scoped RLS, and keep audit logs immutable.</p>
        </article>
        <article>
          <strong>User-safe inbox import</strong>
          <p>Live previews import textPresent only. Mock fixture text is redacted in server import previews and raw Meta payloads are not stored.</p>
        </article>
      </div>

      <div className="saasChecklistDeck">
        <section aria-label="Cost checklist">
          <h3>Cost checklist</h3>
          {costChecklist.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
        <section aria-label="Deployment gates">
          <h3>Deployment gates</h3>
          {deploymentGates.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      </div>
    </section>
  )
}
