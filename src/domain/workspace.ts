import { CLASSIFICATION_LABELS } from "./labels"
import type { Analysis, Classification, KnowledgeSuggestion, WorkspacePreset } from "./types"

type PresetHints = {
  readonly quickReplies: readonly string[]
  readonly focus: readonly string[]
}

const BASE_SUGGESTIONS: Record<Classification, readonly KnowledgeSuggestion[]> = {
  product: [
    { title: "재고/옵션 확인", body: "상품명, 옵션, 수량을 먼저 확인하고 가능 여부를 짧게 안내합니다.", cue: "상품 문의" },
    { title: "대체 안내", body: "품절 또는 미정이면 입고 알림, 유사 옵션, 확인 예정 시간을 함께 제시합니다.", cue: "옵션/재고" },
  ],
  quote: [
    { title: "견적 기준", body: "수량, 범위, 납기, 예산 중 빠진 조건을 확인한 뒤 금액 범위를 안내합니다.", cue: "가격/견적" },
    { title: "확정 전 문구", body: "정확한 비용은 세부 조건 확인 후 확정된다는 문장을 포함합니다.", cue: "비용 조건" },
  ],
  booking: [
    { title: "예약 가능 여부", body: "희망 일시, 인원, 지점 또는 진행 채널을 확인하고 가능한 슬롯을 제안합니다.", cue: "예약/일정" },
    { title: "변경 여지", body: "일정 조율이 필요하면 대체 시간 2개 이상을 요청합니다.", cue: "일정 조율" },
  ],
  support: [
    { title: "불편 공감", body: "먼저 불편을 인정한 뒤 주문/예약번호, 연락처, 증상 정보를 확인합니다.", cue: "고객지원" },
    { title: "처리 기준", body: "환불, 교환, 취소 요청은 확인 절차와 예상 응답 시간을 분리해 안내합니다.", cue: "처리 절차" },
  ],
  partnership: [
    { title: "제휴 검토 정보", body: "목적, 제안 내용, 일정, 담당자 연락처를 받아 내부 검토 흐름으로 넘깁니다.", cue: "제휴/협업" },
    { title: "범위 정리", body: "콘텐츠 교환, 샘플, 공동 프로모션처럼 제안 범위를 구조화합니다.", cue: "협업 범위" },
  ],
  spam: [
    { title: "홍보성 메시지", body: "외부 링크, 팔로워 증가, 투자성 문구는 자동 발송 대신 무시 또는 수동 검토로 둡니다.", cue: "스팸 후보" },
    { title: "응답 최소화", body: "필요 시 관련 없는 제안은 진행이 어렵다는 짧은 거절 문구만 사용합니다.", cue: "거절 응답" },
  ],
  other: [
    { title: "문의 목적 확인", body: "주제, 필요한 답변 범위, 연락 가능한 채널을 확인하는 중립 문구를 사용합니다.", cue: "일반 문의" },
    { title: "다음 단계", body: "담당자가 확인할 기준을 먼저 모은 뒤 안내하겠다고 정리합니다.", cue: "정보 확인" },
  ],
}

export const PRESET_HINTS: Record<WorkspacePreset, PresetHints> = {
  generic: {
    quickReplies: ["확인 후 안내드리겠습니다.", "추가 정보 부탁드립니다.", "담당자가 검토하겠습니다."],
    focus: ["문의 목적", "연락 가능 채널", "다음 진행 기준"],
  },
  ecommerce: {
    quickReplies: ["옵션과 재고 확인 후 안내드리겠습니다.", "주문번호를 알려주시면 확인하겠습니다.", "배송/교환 기준을 확인해드리겠습니다."],
    focus: ["상품/옵션", "주문번호", "배송/교환 상태"],
  },
  bookingService: {
    quickReplies: ["희망 일시와 인원을 알려주세요.", "가능한 시간대를 확인해드리겠습니다.", "방문/온라인 진행 여부를 확인하겠습니다."],
    focus: ["희망 일시", "인원/지점", "예약 변경 가능성"],
  },
  creatorCommunity: {
    quickReplies: ["참여 방식과 일정을 정리해드리겠습니다.", "협업 목적을 알려주시면 검토하겠습니다.", "커뮤니티 안내 링크는 수동 확인 후 공유합니다."],
    focus: ["참여 목적", "협업 범위", "콘텐츠 일정"],
  },
  customerSupport: {
    quickReplies: ["불편을 확인하고 처리 절차를 안내드리겠습니다.", "주문/예약번호와 연락처를 부탁드립니다.", "담당 확인 후 예상 처리 시간을 공유드리겠습니다."],
    focus: ["긴급도", "식별 번호", "처리 예상 시간"],
  },
}

export function buildKnowledgeSuggestions(
  analysis: Analysis,
  workspacePreset: WorkspacePreset,
): readonly KnowledgeSuggestion[] {
  const suggestions: KnowledgeSuggestion[] = [...BASE_SUGGESTIONS[analysis.classification]]
  const preset = PRESET_HINTS[workspacePreset]
  const topic = analysis.fields.topic ?? CLASSIFICATION_LABELS[analysis.classification]

  suggestions.push({
    title: "워크스페이스 체크",
    body: `${preset.focus.join(", ")} 기준으로 ${topic} 응답에 필요한 정보를 확인합니다.`,
    cue: "프리셋 힌트",
  })

  return suggestions.slice(0, 3)
}
