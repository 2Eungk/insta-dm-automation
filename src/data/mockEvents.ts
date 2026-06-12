import type { InstagramEvent } from "../domain/types"

export const MOCK_EVENTS: readonly InstagramEvent[] = [
  {
    id: "evt_1001",
    channel: "dm",
    senderName: "지우",
    senderHandle: "@jiwoo.shop",
    receivedAt: "2026-06-12T09:12:00+09:00",
    message:
      "안녕하세요. 온라인몰에서 본 여름 니트 아이보리 M 사이즈 재고 있나요? 가격도 궁금합니다.",
  },
  {
    id: "evt_1002",
    channel: "comment",
    senderName: "민서",
    senderHandle: "@minseo.daily",
    receivedAt: "2026-06-12T10:04:00+09:00",
    message: "원데이 클래스 다음 주 토요일 2명 예약 가능할까요? 강남 매장 방문 희망해요.",
  },
  {
    id: "evt_1003",
    channel: "dm",
    senderName: "도윤",
    senderHandle: "@doyoon_88",
    receivedAt: "2026-06-11T17:42:00+09:00",
    message: "주문번호 OD-4928 상품이 아직 배송 전으로 보여요. 이번 주 안에 받을 수 있을까요? 연락은 help@example.com 입니다.",
  },
  {
    id: "evt_1004",
    channel: "dm",
    senderName: "제휴제안팀",
    senderHandle: "@partner.note",
    receivedAt: "2026-06-11T15:19:00+09:00",
    message: "안녕하세요. 다음 달 공동 프로모션 제휴 제안드리고 싶습니다. 샘플 제공과 콘텐츠 교환 가능할까요?",
  },
  {
    id: "evt_1005",
    channel: "comment",
    senderName: "딜마켓",
    senderHandle: "@deal_market_777",
    receivedAt: "2026-06-10T22:20:00+09:00",
    message: "팔로워 1만명 바로 증가! 지금 링크 클릭하면 무료 체험 가능합니다 http://promo.example",
  },
  {
    id: "evt_1006",
    channel: "dm",
    senderName: "서연",
    senderHandle: "@seoyeon.note",
    receivedAt: "2026-06-10T11:03:00+09:00",
    message: "안녕하세요. 자세한 안내는 어디에서 확인할 수 있나요?",
  },
]
