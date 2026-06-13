import { LiveConnectionPanel } from "./LiveConnectionPanel"
import { MetaIntegrationReadiness } from "./MetaIntegrationReadiness"
import { SaasReadinessPanel } from "./SaasReadinessPanel"

export function MetaConnectionSection(): React.JSX.Element {
  return (
    <section className="metaConnectionSection" aria-label="Meta connection diagnostics">
      <SaasReadinessPanel />
      <MetaIntegrationReadiness />
      <LiveConnectionPanel />
    </section>
  )
}
