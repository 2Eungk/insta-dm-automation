import { CLASSIFICATIONS, type Classification } from "./types"

const keywordGroups: Record<Classification, readonly string[]> = {
  product: ["상품", "제품", "재고", "입고", "사이즈", "색상", "구매", "판매", "품절"],
  quote: ["견적", "비용", "예산", "얼마", "가격", "금액", "단가", "견적서"],
  booking: ["예약", "일정", "가능", "시간", "방문", "상담", "클래스", "언제"],
  support: ["배송", "교환", "환불", "불량", "누락", "주문", "예약번호", "취소", "불편", "컴플레인"],
  partnership: ["협업", "제휴", "공동", "제안", "콜라보", "파트너", "입점", "공급사"],
  spam: ["팔로워", "무료 체험", "링크 클릭", "수익", "홍보", "http", "투자", "자동화"],
  other: [],
}

export function classifyMessage(message: string): { readonly classification: Classification; readonly confidence: number } {
  const normalized = message.toLowerCase()
  const scores = CLASSIFICATIONS.map((classification) => ({
    classification,
    score: keywordGroups[classification].filter((keyword) => normalized.includes(keyword.toLowerCase()))
      .length,
  }))
  const top = scores.reduce((best, current) => (current.score > best.score ? current : best))

  if (top === undefined || top.score === 0) {
    return { classification: "other", confidence: 0.42 }
  }

  if (top.classification === "spam") {
    return { classification: "spam", confidence: 0.96 }
  }

  const confidence = Math.min(0.92, 0.48 + top.score * 0.14)
  return { classification: top.classification, confidence }
}
