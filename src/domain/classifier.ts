import { CLASSIFICATIONS, type Classification } from "./types"

const keywordGroups: Record<Classification, readonly string[]> = {
  shooting: ["촬영", "영상", "필름", "스케치", "프로필", "웨딩", "브랜드"],
  quote: ["견적", "비용", "예산", "얼마", "가격", "금액"],
  schedule: ["일정", "가능", "비어", "날짜", "예약", "언제"],
  collaboration: ["협업", "공동", "제안", "콜라보", "교환", "파트너"],
  spam: ["팔로워", "무료 체험", "링크 클릭", "수익", "홍보", "http"],
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
