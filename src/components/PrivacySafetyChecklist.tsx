const READINESS_ITEMS = [
  {
    title: "Business / Creator account",
    body: "Confirm the Instagram account type and ownership chain before any production connection.",
  },
  {
    title: "Facebook Page link",
    body: "Confirm the Instagram account is connected to the correct Facebook Page and business assets.",
  },
  {
    title: "App review permissions",
    body: "Map required Meta permissions, reviewer evidence, and allowed use cases before app review.",
  },
  {
    title: "Webhook endpoint",
    body: "Design verification, retries, rate limits, and abuse handling before exposing any endpoint.",
  },
  {
    title: "Token storage",
    body: "Use backend-only encrypted storage and rotation. This local app stores no secrets.",
  },
  {
    title: "Privacy disclosure",
    body: "Publish what message data is processed, why, who reviews it, and how users can request deletion.",
  },
  {
    title: "Retention policy",
    body: "Define deletion windows for messages, exports, audit logs, and operator notes before launch.",
  },
  {
    title: "Operator approval flow",
    body: "Require reviewer, approver, admin, and audit-only roles before any real customer reply.",
  },
] as const

export function PrivacySafetyChecklist(): React.JSX.Element {
  return (
    <section className="privacyChecklist" aria-labelledby="privacy-checklist-title">
      <header>
        <div>
          <p className="eyebrow">Integration readiness</p>
          <h2 id="privacy-checklist-title">Ready before Meta checklist</h2>
        </div>
        <span>Planning only · non-functional</span>
      </header>
      <div className="privacyChecklistGrid">
        {READINESS_ITEMS.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
