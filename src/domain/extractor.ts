import type { ExtractedFields, MissingField } from "./types"

const shootTypes = ["브랜드 필름", "프로필", "웨딩", "릴스", "워크숍 스케치", "스케치 영상"] as const
const locations = ["서울", "성수", "강남", "부산", "제주", "홍대", "판교", "인천", "대구"] as const

function findFirst(text: string, candidates: readonly string[]): string | null {
  return candidates.find((candidate) => text.includes(candidate)) ?? null
}

function extractDate(text: string): string | null {
  const explicitDate = /(\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}\/\d{1,2}|\d{1,2}\.\d{1,2})/.exec(text)
  const explicitDateValue = explicitDate?.[1]
  if (explicitDateValue !== undefined) {
    return explicitDateValue
  }

  const relativeDate = /(다음\s*달|이번\s*주|다음\s*주|주말|날짜는 아직 조율 중)/.exec(text)
  return relativeDate?.[1] ?? null
}

function extractBudget(text: string): string | null {
  const budget = /(\d{2,4}\s*(?:~|-|전후)?\s*\d{0,4}\s*(?:만원|만|정도))/.exec(text)
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

export function extractFields(message: string): ExtractedFields {
  const fields = {
    shootType: findFirst(message, shootTypes),
    location: findFirst(message, locations),
    preferredDate: extractDate(message),
    budget: extractBudget(message),
    contact: extractContact(message),
  }

  const missing: MissingField[] = []
  if (fields.shootType === null) missing.push("shootType")
  if (fields.location === null) missing.push("location")
  if (fields.preferredDate === null) missing.push("preferredDate")
  if (fields.budget === null) missing.push("budget")
  if (fields.contact === null) missing.push("contact")

  return { ...fields, missing }
}
