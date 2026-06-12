import type { LocalAnalytics, AnalyticsSegment, MissingInfoHotspot } from "../domain/analytics"

type AnalyticsPanelProps = {
  readonly analytics: LocalAnalytics
}

type DistributionBlockProps = {
  readonly title: string
  readonly segments: readonly AnalyticsSegment[]
}

function DistributionBlock({ title, segments }: DistributionBlockProps): React.JSX.Element {
  return (
    <section className="analyticsBlock">
      <h3>{title}</h3>
      <div className="analyticsBars">
        {segments.map((segment) => (
          <div key={segment.id} className="analyticsBarRow">
            <div className="analyticsBarLabel">
              <span>{segment.label}</span>
              <strong>{segment.value}</strong>
            </div>
            <div className="analyticsBarTrack" aria-hidden="true">
              <div className={`analyticsBarFill analytics-${segment.id}`} style={{ width: `${segment.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function HotspotList({ hotspots }: { readonly hotspots: readonly MissingInfoHotspot[] }): React.JSX.Element {
  if (hotspots.length === 0) {
    return <p className="analyticsEmpty">현재 필터에서 누락 정보 핫스팟이 없습니다.</p>
  }

  return (
    <div className="hotspotList">
      {hotspots.slice(0, 4).map((hotspot) => (
        <article key={hotspot.field}>
          <span>{hotspot.label}</span>
          <strong>{hotspot.value}</strong>
          <em>{hotspot.percent}%</em>
        </article>
      ))}
    </div>
  )
}

export function AnalyticsPanel({ analytics }: AnalyticsPanelProps): React.JSX.Element {
  return (
    <section className="analyticsPanel" aria-label="로컬 분석">
      <div className="analyticsHeader">
        <div>
          <p>Local Analytics</p>
          <strong>{analytics.total} visible</strong>
        </div>
        <span>샘플과 현재 필터 기준</span>
      </div>
      <div className="analyticsGrid">
        <DistributionBlock title="Classification" segments={analytics.classificationDistribution} />
        <DistributionBlock title="Priority" segments={analytics.priorityDistribution} />
        <DistributionBlock title="Response status" segments={analytics.statusDistribution} />
        <section className="analyticsBlock">
          <h3>Missing-info hotspots</h3>
          <HotspotList hotspots={analytics.missingInfoHotspots} />
        </section>
      </div>
    </section>
  )
}
