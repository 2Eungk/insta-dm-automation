import type { InstagramEvent, SampleScenario } from "../domain/types"
import { MOCK_EVENTS } from "./mockEvents"

export const SAMPLE_SCENARIO_LABELS: Record<SampleScenario, string> = {
  generic: "Generic",
  ecommerce: "Ecommerce",
  booking: "Booking",
  support: "Support",
}

export const SAMPLE_SCENARIO_DESCRIPTIONS: Record<SampleScenario, string> = {
  generic: "Mixed social inbox with product, booking, support, partnership, spam, and open-ended questions.",
  ecommerce: "Retail-style DMs focused on stock, price, delivery, exchanges, and order references.",
  booking: "Appointment and service inquiries that need date, location, channel, and contact details.",
  support: "Customer-care queue with urgent support, refund, cancellation, and missing-info cases.",
}

const ECOMMERCE_EVENTS: readonly InstagramEvent[] = [
  {
    id: "eco_2001",
    channel: "dm",
    senderName: "하린",
    senderHandle: "@harin.fit",
    receivedAt: "2026-06-12T08:45:00+09:00",
    message: "블랙 자켓 S 사이즈 재고 있나요? 스마트스토어 가격이랑 매장 가격도 같은지 궁금합니다.",
  },
  {
    id: "eco_2002",
    channel: "comment",
    senderName: "준호",
    senderHandle: "@junho.order",
    receivedAt: "2026-06-12T10:31:00+09:00",
    message: "주문번호 OD-7781 배송이 아직 준비중이에요. 이번 주 안에 받을 수 있을까요? 연락은 junho@example.com 입니다.",
  },
  {
    id: "eco_2003",
    channel: "dm",
    senderName: "수아",
    senderHandle: "@sua.home",
    receivedAt: "2026-06-11T18:12:00+09:00",
    message: "세트 3개 구매하면 견적이나 할인 금액이 있을까요? 예산은 15만원 정도입니다.",
  },
  {
    id: "eco_2004",
    channel: "comment",
    senderName: "리뷰업",
    senderHandle: "@review_boost",
    receivedAt: "2026-06-11T14:09:00+09:00",
    message: "팔로워 증가와 구매 후기 자동화 무료 체험 가능합니다 http://promo.example",
  },
]

const BOOKING_EVENTS: readonly InstagramEvent[] = [
  {
    id: "book_3001",
    channel: "dm",
    senderName: "나연",
    senderHandle: "@nayeon.plan",
    receivedAt: "2026-06-12T09:22:00+09:00",
    message: "다음 주 토요일 원데이 클래스 2명 예약 가능할까요? 강남 매장 방문 희망하고 연락처는 010-2222-3344입니다.",
  },
  {
    id: "book_3002",
    channel: "comment",
    senderName: "태오",
    senderHandle: "@taeo.note",
    receivedAt: "2026-06-12T11:14:00+09:00",
    message: "상담 예약하고 싶은데 시간은 조율 가능하고 온라인으로도 가능한가요?",
  },
  {
    id: "book_3003",
    channel: "dm",
    senderName: "유진",
    senderHandle: "@yujin.weekend",
    receivedAt: "2026-06-11T16:33:00+09:00",
    message: "예약번호 RSV-9021 일정 취소 가능할까요? 내일 방문 예정이었는데 불편을 드려 죄송합니다.",
  },
  {
    id: "book_3004",
    channel: "dm",
    senderName: "민재",
    senderHandle: "@minjae.group",
    receivedAt: "2026-06-10T13:05:00+09:00",
    message: "부산 지점에서 7월 3일 4명 예약과 비용 견적을 같이 받고 싶습니다.",
  },
]

const SUPPORT_EVENTS: readonly InstagramEvent[] = [
  {
    id: "sup_4001",
    channel: "dm",
    senderName: "은서",
    senderHandle: "@eunseo.help",
    receivedAt: "2026-06-12T07:58:00+09:00",
    message: "주문번호 OD-1108 상품이 누락되어 왔어요. 환불이나 교환 처리 부탁드립니다. 연락은 eunseo@example.com 입니다.",
  },
  {
    id: "sup_4002",
    channel: "comment",
    senderName: "현우",
    senderHandle: "@hyunwoo_cs",
    receivedAt: "2026-06-12T12:40:00+09:00",
    message: "예약번호 BK-4512 취소가 안 됩니다. 오늘 안에 처리 가능할까요?",
  },
  {
    id: "sup_4003",
    channel: "dm",
    senderName: "소담",
    senderHandle: "@sodam.daily",
    receivedAt: "2026-06-11T20:17:00+09:00",
    message: "배송이 아직 도착하지 않았는데 주문 번호를 어디서 확인해야 하나요?",
  },
  {
    id: "sup_4004",
    channel: "dm",
    senderName: "광고문의",
    senderHandle: "@ad_click_now",
    receivedAt: "2026-06-11T09:51:00+09:00",
    message: "링크 클릭하면 고객지원 자동화와 투자 수익 무료 체험 가능합니다 http://spam.example",
  },
]

export const SAMPLE_SCENARIO_EVENTS: Record<SampleScenario, readonly InstagramEvent[]> = {
  generic: MOCK_EVENTS,
  ecommerce: ECOMMERCE_EVENTS,
  booking: BOOKING_EVENTS,
  support: SUPPORT_EVENTS,
}
