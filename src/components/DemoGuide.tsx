const DEMO_STEPS = [
  {
    title: "1. Pick a sample",
    body: "Start with Generic, Ecommerce, Booking, or Support to change the bundled inbox without fetching data.",
  },
  {
    title: "2. Filter the queue",
    body: "Use Needs info, High priority, Support queue, or Spam review to show why an operator would triage first.",
  },
  {
    title: "3. Open one message",
    body: "Review the classification, extracted fields, risk signals, and missing-info chips in the detail panel.",
  },
  {
    title: "4. Approve locally",
    body: "Edit the Korean draft, set hold or approved, then add a mock send log without contacting Instagram.",
  },
  {
    title: "5. Export proof",
    body: "Download JSON or CSV as a browser-only handoff artifact for a demo recap or QA notes.",
  },
] as const

export function DemoGuide(): React.JSX.Element {
  return (
    <section className="demoGuide" aria-labelledby="demo-guide-title">
      <div className="demoGuideLead">
        <p className="eyebrow">Demo mode</p>
        <h2 id="demo-guide-title">Best clickable path for a 5-minute walkthrough</h2>
        <p>
          This is a local-only simulation. The strongest flow is sample selection, triage filters, one detailed
          review, a mock approval, then a local export.
        </p>
      </div>
      <ol className="demoSteps">
        {DEMO_STEPS.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
