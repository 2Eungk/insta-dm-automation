const DEMO_STEPS = [
  {
    title: "1. 샘플 선택",
    body: "공통, 쇼핑몰, 예약, 고객응대 샘플을 바꿔 보며 실제 데이터 호출 없이 문의함을 확인합니다.",
  },
  {
    title: "2. 큐 필터링",
    body: "정보 필요, 긴급, 고객지원, 스팸 검토 보기로 운영자가 먼저 볼 문의를 좁힙니다.",
  },
  {
    title: "3. 문의 하나 열기",
    body: "상세 패널에서 분류, 추출 정보, 리스크 신호, 누락 정보 칩을 확인합니다.",
  },
  {
    title: "4. 로컬 승인",
    body: "한국어 초안을 고치고 보류/승인을 표시한 뒤 Instagram 접속 없이 목업 전송 로그만 남깁니다.",
  },
  {
    title: "5. 검토본 내보내기",
    body: "데모 정리나 QA 메모용으로 브라우저에서 만든 JSON/CSV 파일만 내려받습니다.",
  },
] as const

export function DemoGuide(): React.JSX.Element {
  return (
    <section className="demoGuide" aria-labelledby="demo-guide-title">
      <div className="demoGuideLead">
        <p className="eyebrow">데모 모드</p>
        <h2 id="demo-guide-title">5분 시연용 클릭 흐름</h2>
        <p>
          이 화면은 로컬 전용 시뮬레이션입니다. 샘플 선택 → 필터 → 상세 검토 → 목업 승인 → 로컬 내보내기 순서가 가장 자연스럽습니다.
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
