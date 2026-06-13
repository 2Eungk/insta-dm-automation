const costChecklist = [
  "Cheapest next path: one Cloud Run service plus a manual admin invite code",
  "Add Firestore only when tester state or audit history must survive restarts",
  "Add Secret Manager only before storing real Meta app secrets or token material",
  "Verify all pricing before enabling billing; keep a stop-and-review budget cap",
] as const

const deploymentGates = [
  "3-5 trusted testers only, onboarded manually with explicit friend consent",
  "Read-only or approval-only; no auto-send and no real webhook subscriptions",
  "Token deletion path required before any friend connects a real account",
  "No public marketing until Meta app review and business verification are done",
] as const

export function SaasReadinessPanel(): React.JSX.Element {
  return (
    <section className="saasReadinessPanel" aria-labelledby="saas-readiness-title">
      <header>
        <div>
          <p className="eyebrow">지인 베타 모드</p>
          <h2 id="saas-readiness-title">Friends beta candidate, not public SaaS</h2>
          <p>Keep the launch to acquaintances: manual invites, read-only diagnostics, approval-only drafts, and no paid or public infrastructure yet.</p>
        </div>
        <span>Friends beta only</span>
      </header>

      <div className="saasReadinessGrid">
        <article>
          <strong>Cheapest next path</strong>
          <p>Start with a single Cloud Run-shaped server and one admin-issued invite code before adding Firebase Auth, Firestore, or Secret Manager.</p>
        </article>
        <article>
          <strong>Beta boundary</strong>
          <p>Production readiness stays false. Friends beta stays true only while sends, webhook subscriptions, payments, and token exposure are false.</p>
        </article>
        <article>
          <strong>Tester promise</strong>
          <p>Use 3-5 trusted testers, manual onboarding, friend consent, and a token deletion path before any real account connection.</p>
        </article>
      </div>

      <div className="saasChecklistDeck">
        <section aria-label="Cost checklist">
          <h3>Minimal GCP-ish path</h3>
          {costChecklist.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
        <section aria-label="Deployment gates">
          <h3>Risk boundaries</h3>
          {deploymentGates.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </section>
      </div>
    </section>
  )
}
