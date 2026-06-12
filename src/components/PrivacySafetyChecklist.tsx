const READINESS_ITEMS = [
  {
    title: "Permissions",
    body: "Map the exact Meta scopes, reviewer access, and account ownership before connecting any production app.",
  },
  {
    title: "Retention",
    body: "Define how long message text, exports, local notes, and audit events are retained or deleted.",
  },
  {
    title: "Operator roles",
    body: "Separate reviewer, approver, admin, and audit-only roles before allowing real customer conversations.",
  },
  {
    title: "Template review",
    body: "Review reply templates for policy, tone, escalation, and opt-out language before sending anything.",
  },
] as const

export function PrivacySafetyChecklist(): React.JSX.Element {
  return (
    <section className="privacyChecklist" aria-labelledby="privacy-checklist-title">
      <header>
        <div>
          <p className="eyebrow">Integration readiness</p>
          <h2 id="privacy-checklist-title">Privacy and safety checklist</h2>
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
