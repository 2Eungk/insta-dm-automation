import {
  CLASSIFICATIONS,
  STATUSES,
  type Classification,
  type EventViewModel,
  type MissingField,
  type ReviewPriority,
  type Status,
} from "./types"
import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS, STATUS_LABELS } from "./labels"
import { getReviewPriority } from "./review"

export type AnalyticsSegment = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly percent: number
}

export type MissingInfoHotspot = {
  readonly field: MissingField
  readonly label: string
  readonly value: number
  readonly percent: number
}

export type LocalAnalytics = {
  readonly total: number
  readonly classificationDistribution: readonly AnalyticsSegment[]
  readonly priorityDistribution: readonly AnalyticsSegment[]
  readonly statusDistribution: readonly AnalyticsSegment[]
  readonly missingInfoHotspots: readonly MissingInfoHotspot[]
}

const PRIORITY_ORDER = ["high", "medium", "normal"] as const satisfies readonly ReviewPriority[]

const PRIORITY_LABELS: Record<ReviewPriority, string> = {
  high: "High",
  medium: "Review",
  normal: "Normal",
}

const MISSING_FIELD_ORDER = [
  "topic",
  "productOrService",
  "locationOrChannel",
  "requestedDateTime",
  "budgetOrPrice",
  "contact",
  "orderOrReservationRef",
] as const satisfies readonly MissingField[]

function percentage(value: number, total: number): number {
  if (total === 0) {
    return 0
  }

  return Math.round((value / total) * 100)
}

function emptyClassificationCounts(): Record<Classification, number> {
  return {
    product: 0,
    quote: 0,
    booking: 0,
    support: 0,
    partnership: 0,
    spam: 0,
    other: 0,
  }
}

function emptyPriorityCounts(): Record<ReviewPriority, number> {
  return {
    high: 0,
    medium: 0,
    normal: 0,
  }
}

function emptyStatusCounts(): Record<Status, number> {
  return {
    new: 0,
    drafted: 0,
    approved: 0,
    hold: 0,
    ignored: 0,
  }
}

function emptyMissingCounts(): Record<MissingField, number> {
  return {
    topic: 0,
    productOrService: 0,
    locationOrChannel: 0,
    requestedDateTime: 0,
    budgetOrPrice: 0,
    contact: 0,
    orderOrReservationRef: 0,
  }
}

export function buildLocalAnalytics(items: readonly EventViewModel[]): LocalAnalytics {
  const classificationCounts = emptyClassificationCounts()
  const priorityCounts = emptyPriorityCounts()
  const statusCounts = emptyStatusCounts()
  const missingCounts = emptyMissingCounts()

  for (const item of items) {
    classificationCounts[item.analysis.classification] += 1
    priorityCounts[getReviewPriority(item)] += 1
    statusCounts[item.state.status] += 1

    for (const field of item.analysis.fields.missing) {
      missingCounts[field] += 1
    }
  }

  const total = items.length

  return {
    total,
    classificationDistribution: CLASSIFICATIONS.map((classification) => ({
      id: classification,
      label: CLASSIFICATION_LABELS[classification],
      value: classificationCounts[classification],
      percent: percentage(classificationCounts[classification], total),
    })),
    priorityDistribution: PRIORITY_ORDER.map((priority) => ({
      id: priority,
      label: PRIORITY_LABELS[priority],
      value: priorityCounts[priority],
      percent: percentage(priorityCounts[priority], total),
    })),
    statusDistribution: STATUSES.map((status) => ({
      id: status,
      label: STATUS_LABELS[status],
      value: statusCounts[status],
      percent: percentage(statusCounts[status], total),
    })),
    missingInfoHotspots: MISSING_FIELD_ORDER.map((field) => ({
      field,
      label: MISSING_FIELD_LABELS[field],
      value: missingCounts[field],
      percent: percentage(missingCounts[field], total),
    }))
      .filter((hotspot) => hotspot.value > 0)
      .sort((left, right) => right.value - left.value),
  }
}
