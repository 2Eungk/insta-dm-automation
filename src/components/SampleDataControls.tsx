import {
  SAMPLE_SCENARIO_DESCRIPTIONS,
  SAMPLE_SCENARIO_LABELS,
} from "../data/sampleScenarios"
import { SAMPLE_SCENARIOS, type SampleScenario } from "../domain/types"

type SampleDataControlsProps = {
  readonly sampleScenario: SampleScenario
  readonly eventCount: number
  readonly onSampleScenarioChange: (sampleScenario: SampleScenario) => void
}

function parseSampleScenario(value: string): SampleScenario {
  return SAMPLE_SCENARIOS.find((sampleScenario) => sampleScenario === value) ?? "generic"
}

export function SampleDataControls({
  sampleScenario,
  eventCount,
  onSampleScenarioChange,
}: SampleDataControlsProps): React.JSX.Element {
  return (
    <section className="sampleControls" aria-label="샘플 문의 선택">
      <div className="sampleScenarioPicker">
        <label>
          <span>샘플 시나리오</span>
          <select
            value={sampleScenario}
            onChange={(event) => onSampleScenarioChange(parseSampleScenario(event.target.value))}
            aria-label="샘플 데이터 시나리오 선택"
          >
            {SAMPLE_SCENARIOS.map((scenario) => (
              <option key={scenario} value={scenario}>
                {SAMPLE_SCENARIO_LABELS[scenario]}
              </option>
            ))}
          </select>
        </label>
        <p>{SAMPLE_SCENARIO_DESCRIPTIONS[sampleScenario]}</p>
      </div>
      <div className="sampleActions" aria-label="샘플 데이터 작업">
        <span>목업 문의 {eventCount}건</span>
      </div>
    </section>
  )
}
