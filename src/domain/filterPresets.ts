import { getReviewPriority } from "./review"
import type { EventViewModel } from "./types"

export const FILTER_PRESET_IDS = [
  "all",
  "needsInfo",
  "highPriority",
  "supportQueue",
  "spamReview",
  "approved",
] as const

export type FilterPresetId = (typeof FILTER_PRESET_IDS)[number]

export type FilterPreset = {
  readonly id: FilterPresetId
  readonly label: string
  readonly detail: string
}

export const FILTER_PRESETS: readonly FilterPreset[] = [
  { id: "all", label: "All", detail: "모든 로컬 샘플 문의" },
  { id: "needsInfo", label: "Needs info", detail: "누락 정보가 있는 문의" },
  { id: "highPriority", label: "High priority", detail: "긴급 또는 스팸 신호" },
  { id: "supportQueue", label: "Support queue", detail: "고객지원/불만 분류" },
  { id: "spamReview", label: "Spam review", detail: "스팸 후보 검토" },
  { id: "approved", label: "Approved", detail: "승인 완료 상태" },
]

export function itemMatchesFilterPreset(item: EventViewModel, filterPresetId: FilterPresetId): boolean {
  switch (filterPresetId) {
    case "all":
      return true
    case "needsInfo":
      return item.analysis.fields.missing.length > 0
    case "highPriority":
      return getReviewPriority(item) === "high"
    case "supportQueue":
      return item.analysis.classification === "support"
    case "spamReview":
      return item.analysis.classification === "spam"
    case "approved":
      return item.state.status === "approved"
  }
}
