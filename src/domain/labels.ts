import type { Classification, MissingField, Status } from "./types"

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  shooting: "촬영문의",
  quote: "견적문의",
  schedule: "일정문의",
  collaboration: "협업",
  spam: "스팸",
  other: "기타",
}

export const STATUS_LABELS: Record<Status, string> = {
  new: "신규",
  drafted: "초안작성",
  approved: "승인됨",
  hold: "보류",
  ignored: "무시",
}

export const MISSING_FIELD_LABELS: Record<MissingField, string> = {
  shootType: "촬영종류",
  location: "지역",
  preferredDate: "희망일",
  budget: "예산",
  contact: "연락처",
}
