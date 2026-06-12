import { getDraftQualityChecks } from "../domain/quality"
import type { EventViewModel } from "../domain/types"

type QualityChecklistProps = {
  readonly item: EventViewModel
}

export function QualityChecklist({ item }: QualityChecklistProps): React.JSX.Element {
  const checks = getDraftQualityChecks(item)
  const warnCount = checks.filter((check) => check.state === "warn").length

  return (
    <section className="qualityChecklist" aria-label="초안 품질 체크리스트">
      <header>
        <span>Draft Quality</span>
        <strong>{warnCount === 0 ? "모두 통과" : `${warnCount}개 경고`}</strong>
      </header>
      <div className="qualityGrid">
        {checks.map((check) => (
          <article key={check.id} className={`qualityItem quality-${check.state}`}>
            <span>{check.state === "pass" ? "PASS" : "WARN"}</span>
            <strong>{check.label}</strong>
            <p>{check.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
