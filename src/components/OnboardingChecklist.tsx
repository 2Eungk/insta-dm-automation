type OnboardingChecklistProps = {
  readonly isVisible: boolean
  readonly onToggleVisible: (isVisible: boolean) => void
}

export function OnboardingChecklist({
  isVisible,
  onToggleVisible,
}: OnboardingChecklistProps): React.JSX.Element {
  if (!isVisible) {
    return (
      <section className="onboardingCollapsed" aria-label="첫 실행 체크리스트 숨김 상태">
        <span>목업 전용 검토 흐름</span>
        <button type="button" onClick={() => onToggleVisible(true)} aria-label="첫 실행 체크리스트 다시 보기">
          체크리스트 보기
        </button>
      </section>
    )
  }

  return (
    <section className="onboardingPanel" aria-label="첫 실행 온보딩 체크리스트">
      <header>
        <div>
          <p className="eyebrow">첫 실행 체크리스트</p>
          <h2>로컬 목업 검토 흐름으로 시작</h2>
        </div>
        <button type="button" onClick={() => onToggleVisible(false)} aria-label="첫 실행 체크리스트 숨기기">
          숨기기
        </button>
      </header>
      <div className="onboardingSteps">
        <article>
          <strong>1. 목업 문의함</strong>
          <p>번들 샘플 데이터만 사용합니다. Meta API, 토큰, 서버, 자동 발송은 연결되어 있지 않습니다.</p>
        </article>
        <article>
          <strong>2. 보내기 전 검토</strong>
          <p>분류와 추출 필드를 확인하고 초안을 수정한 뒤 승인 또는 목업 전송 로그만 남깁니다.</p>
        </article>
        <article>
          <strong>3. 실서비스 준비</strong>
          <p>실서비스 전에는 권한 승인, 템플릿 검수, 운영자 역할, 감사 보관 정책을 별도 설계해야 합니다.</p>
        </article>
      </div>
    </section>
  )
}
