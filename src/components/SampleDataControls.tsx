import {
  SAMPLE_SCENARIO_DESCRIPTIONS,
  SAMPLE_SCENARIO_LABELS,
} from "../data/sampleScenarios"
import { SAMPLE_SCENARIOS, type SampleScenario } from "../domain/types"

type SampleDataControlsProps = {
  readonly sampleScenario: SampleScenario
  readonly eventCount: number
  readonly onSampleScenarioChange: (sampleScenario: SampleScenario) => void
  readonly onResetLocalState: () => void
  readonly onExportJson: () => void
  readonly onExportCsv: () => void
}

function parseSampleScenario(value: string): SampleScenario {
  return SAMPLE_SCENARIOS.find((sampleScenario) => sampleScenario === value) ?? "generic"
}

export function SampleDataControls({
  sampleScenario,
  eventCount,
  onSampleScenarioChange,
  onResetLocalState,
  onExportJson,
  onExportCsv,
}: SampleDataControlsProps): React.JSX.Element {
  return (
    <section className="sampleControls" aria-label="샘플 데이터와 로컬 내보내기">
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
        <span>{eventCount} mock events</span>
        <button
          type="button"
          onClick={onResetLocalState}
          aria-label="현재 샘플의 로컬 상태와 감사 로그 초기화"
          title="현재 선택한 샘플의 브라우저 저장 상태만 지우며, 번들 샘플 메시지는 삭제하지 않습니다."
        >
          현재 샘플 초기화
        </button>
        <button
          type="button"
          onClick={onExportJson}
          aria-label="현재 리뷰 데이터를 JSON 파일로 내보내기"
          title="local-mock-fixtures로 표시된 브라우저 생성 JSON을 다운로드합니다."
        >
          JSON 내보내기
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          aria-label="현재 리뷰 데이터를 CSV 파일로 내보내기"
          title="local-mock-fixtures로 표시된 브라우저 생성 CSV를 다운로드합니다."
        >
          CSV 내보내기
        </button>
      </div>
    </section>
  )
}
