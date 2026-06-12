type SummaryCardProps = {
  readonly label: string
  readonly value: number
  readonly detail: string
  readonly tone?: "alert" | "positive"
}

export function SummaryCard({ label, value, detail, tone }: SummaryCardProps): React.JSX.Element {
  const className = tone === undefined ? "summaryCard" : `summaryCard ${tone}`
  return (
    <article className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}
