import { LiveConnectionPanel } from "./LiveConnectionPanel"
import { MetaIntegrationReadiness } from "./MetaIntegrationReadiness"

export function MetaConnectionSection(): React.JSX.Element {
  return (
    <section className="metaConnectionSection" aria-label="Meta connection diagnostics">
      <MetaIntegrationReadiness />
      <LiveConnectionPanel />
    </section>
  )
}
