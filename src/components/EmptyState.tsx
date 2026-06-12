type EmptyStateProps = {
  readonly title: string
  readonly body: string
}

export function EmptyState({ title, body }: EmptyStateProps): React.JSX.Element {
  return (
    <section className="emptyState" aria-live="polite">
      <strong>{title}</strong>
      <p>{body}</p>
    </section>
  )
}
