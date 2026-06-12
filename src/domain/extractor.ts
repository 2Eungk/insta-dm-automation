import type { Classification, ExtractedFields, MissingField } from "./types"

const productsAndServices = [
  "니트",
  "자켓",
  "향수",
  "원데이 클래스",
  "상담",
  "배송",
  "정기구독",
  "샘플",
  "세트",
] as const
const locationsAndChannels = [
  "서울",
  "성수",
  "강남",
  "부산",
  "제주",
  "홍대",
  "판교",
  "인천",
  "대구",
  "온라인몰",
  "스마트스토어",
  "카카오톡",
  "매장",
  "인스타그램",
] as const

const topicLabels: Record<Classification, string> = {
  product: "상품 문의",
  quote: "가격/견적 문의",
  booking: "예약/일정 문의",
  support: "고객지원/불만",
  partnership: "제휴/협업 제안",
  spam: "스팸 가능성",
  other: "일반 문의",
}

function findFirst(text: string, candidates: readonly string[]): string | null {
  return candidates.find((candidate) => text.includes(candidate)) ?? null
}

function extractDate(text: string): string | null {
  const explicitDate = /(\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\/\d{1,2}|\d{1,2}\.\d{1,2}|\d{1,2}\s*시)/.exec(text)
  const explicitDateValue = explicitDate?.[1]
  if (explicitDateValue !== undefined) {
    return explicitDateValue
  }

  const relativeDate = /(오늘|내일|다음\s*달|이번\s*주|다음\s*주|주말|날짜는 아직 조율 중|시간은 조율 가능)/.exec(text)
  return relativeDate?.[1] ?? null
}

function extractBudget(text: string): string | null {
  const budget = /(\d{1,4}\s*(?:~|-|전후)?\s*\d{0,4}\s*(?:만원|만|원|정도))/.exec(text)
  return budget?.[1] ?? null
}

function extractContact(text: string): string | null {
  const phone = /(010[-\s]?\d{4}[-\s]?\d{4})/.exec(text)
  const phoneValue = phone?.[1]
  if (phoneValue !== undefined) {
    return phoneValue
  }

  const email = /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/.exec(text)
  return email?.[0] ?? null
}

function extractReference(text: string): string | null {
  const reference = /((?:주문|예약|문의)\s*(?:번호|No\.?|#)?\s*[:：-]?\s*[A-Za-z0-9-]{4,})/.exec(text)
  return reference?.[1] ?? null
}

function missingFieldsFor(classification: Classification, fields: Omit<ExtractedFields, "missing">): readonly MissingField[] {
  const missing: MissingField[] = []

  if (fields.topic === null) missing.push("topic")

  if ((classification === "product" || classification === "quote" || classification === "booking") && fields.productOrService === null) {
    missing.push("productOrService")
  }

  if (classification === "booking" && fields.requestedDateTime === null) {
    missing.push("requestedDateTime")
  }

  if (classification === "quote" && fields.budgetOrPrice === null) {
    missing.push("budgetOrPrice")
  }

  if ((classification === "support" || classification === "booking" || classification === "partnership") && fields.contact === null) {
    missing.push("contact")
  }

  if (classification === "support" && fields.orderOrReservationRef === null) {
    missing.push("orderOrReservationRef")
  }

  return missing
}

export function extractFields(message: string, classification: Classification): ExtractedFields {
  const fields = {
    topic: topicLabels[classification],
    productOrService: findFirst(message, productsAndServices),
    locationOrChannel: findFirst(message, locationsAndChannels),
    requestedDateTime: extractDate(message),
    budgetOrPrice: extractBudget(message),
    contact: extractContact(message),
    orderOrReservationRef: extractReference(message),
  }

  return { ...fields, missing: missingFieldsFor(classification, fields) }
}
