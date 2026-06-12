import type { InstagramEvent } from "../domain/types"

export const MOCK_EVENTS: readonly InstagramEvent[] = [
  {
    id: "evt_1001",
    channel: "dm",
    senderName: "오브제 스튜디오",
    senderHandle: "@objet.kr",
    receivedAt: "2026-06-12T09:12:00+09:00",
    message:
      "안녕하세요. 7월 18일 성수 쇼룸에서 브랜드 필름 촬영 가능할까요? 예산은 300만원 전후이고 담당자 연락처는 010-4721-3388입니다.",
  },
  {
    id: "evt_1002",
    channel: "comment",
    senderName: "민지",
    senderHandle: "@minji.snap",
    receivedAt: "2026-06-12T10:04:00+09:00",
    message: "프로필 촬영도 하시나요? 서울 강남이고 견적 궁금합니다!",
  },
  {
    id: "evt_1003",
    channel: "dm",
    senderName: "하늘웨딩",
    senderHandle: "@haneulwedding",
    receivedAt: "2026-06-11T17:42:00+09:00",
    message: "9/7 부산 야외 웨딩 영상 촬영 일정 비어있으신지 문의드립니다. 연락은 wedding@haneul.kr 로 부탁드려요.",
  },
  {
    id: "evt_1004",
    channel: "dm",
    senderName: "Jae Film Lab",
    senderHandle: "@jae.filmlab",
    receivedAt: "2026-06-11T15:19:00+09:00",
    message: "대표님 안녕하세요. 릴스 공동 제작 협업 제안드리고 싶습니다. 포트폴리오 교환 가능할까요?",
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
    senderName: "라운드테이블",
    senderHandle: "@roundtable.seoul",
    receivedAt: "2026-06-10T11:03:00+09:00",
    message:
      "다음 달 제주 워크숍 스케치 영상 문의드립니다. 날짜는 아직 조율 중이고 예산은 150~200 정도 생각하고 있어요.",
  },
]
