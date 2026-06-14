const READINESS_ITEMS = [
  {
    title: "비즈니스/크리에이터 계정",
    body: "실서비스 연결 전 Instagram 계정 유형과 소유 권한 흐름을 먼저 확인합니다.",
  },
  {
    title: "Facebook 페이지 연결",
    body: "Instagram 계정이 올바른 Facebook 페이지와 비즈니스 자산에 연결되어 있는지 확인합니다.",
  },
  {
    title: "앱 심사 권한",
    body: "Meta 앱 심사 전에 필요한 권한, 제출 증빙, 허용 사용 사례를 정리합니다.",
  },
  {
    title: "웹훅 엔드포인트",
    body: "외부 공개 전에 검증, 재시도, 호출 제한, 악용 대응 방식을 설계합니다.",
  },
  {
    title: "토큰 보관",
    body: "토큰은 백엔드 암호화 저장과 교체 정책이 필요합니다. 이 로컬 앱은 비밀값을 저장하지 않습니다.",
  },
  {
    title: "개인정보 고지",
    body: "어떤 메시지 데이터를 왜 처리하는지, 누가 검토하는지, 삭제 요청은 어떻게 받는지 공개해야 합니다.",
  },
  {
    title: "보관/삭제 정책",
    body: "메시지, 내보내기 파일, 감사 로그, 운영자 메모의 삭제 주기를 출시 전에 정합니다.",
  },
  {
    title: "운영자 승인 흐름",
    body: "실제 고객 답장 전 검토자, 승인자, 관리자, 감사 전용 역할을 분리합니다.",
  },
] as const

export function PrivacySafetyChecklist(): React.JSX.Element {
  return (
    <section className="privacyChecklist" aria-labelledby="privacy-checklist-title">
      <header>
        <div>
          <p className="eyebrow">실서비스 전 점검</p>
          <h2 id="privacy-checklist-title">Meta 연결 전 체크리스트</h2>
        </div>
        <span>기획용 · 실제 연결 없음</span>
      </header>
      <div className="privacyChecklistGrid">
        {READINESS_ITEMS.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
