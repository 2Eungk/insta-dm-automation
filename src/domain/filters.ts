import { itemMatchesFilterPreset, type FilterPresetId } from "./filterPresets"
import type { Classification, EventViewModel, Status } from "./types"

export type DashboardFilters = {
  readonly query: string
  readonly classification: Classification | "all"
  readonly status: Status | "all"
  readonly filterPresetId: FilterPresetId
}

function includesSearch(item: EventViewModel, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) {
    return true
  }

  return [item.event.senderName, item.event.senderHandle, item.event.message, item.state.draft]
    .join(" ")
    .toLowerCase()
    .includes(normalized)
}

export function filterReviewEvents(
  items: readonly EventViewModel[],
  filters: DashboardFilters,
): readonly EventViewModel[] {
  return items.filter((item) => {
    const matchesClassification =
      filters.classification === "all" || item.analysis.classification === filters.classification
    const matchesStatus = filters.status === "all" || item.state.status === filters.status

    return (
      itemMatchesFilterPreset(item, filters.filterPresetId) &&
      matchesClassification &&
      matchesStatus &&
      includesSearch(item, filters.query)
    )
  })
}
