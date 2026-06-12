import { CLASSIFICATION_LABELS, STATUS_LABELS } from "./labels"
import type { AuditLogEntry, EventViewModel, SampleScenario } from "./types"

type ReviewExportItem = {
  readonly id: string
  readonly channel: string
  readonly senderName: string
  readonly senderHandle: string
  readonly receivedAt: string
  readonly message: string
  readonly status: string
  readonly statusLabel: string
  readonly classification: string
  readonly classificationLabel: string
  readonly confidence: number
  readonly topic: string | null
  readonly productOrService: string | null
  readonly locationOrChannel: string | null
  readonly requestedDateTime: string | null
  readonly budgetOrPrice: string | null
  readonly contact: string | null
  readonly orderOrReservationRef: string | null
  readonly missingFields: string
  readonly draft: string
  readonly mockSendCount: number
  readonly auditCount: number
}

type ReviewExportPayload = {
  readonly exportedAt: string
  readonly sampleScenario: SampleScenario
  readonly networkPolicy: "browser-download-only"
  readonly items: readonly ReviewExportItem[]
}

const CSV_HEADERS = [
  "id",
  "channel",
  "senderName",
  "senderHandle",
  "receivedAt",
  "status",
  "statusLabel",
  "classification",
  "classificationLabel",
  "confidence",
  "topic",
  "productOrService",
  "locationOrChannel",
  "requestedDateTime",
  "budgetOrPrice",
  "contact",
  "orderOrReservationRef",
  "missingFields",
  "draft",
  "mockSendCount",
  "auditCount",
] as const

function auditCountForEvent(eventId: string, auditLog: readonly AuditLogEntry[]): number {
  return auditLog.filter((entry) => entry.eventIds.includes(eventId)).length
}

function buildExportItems(
  items: readonly EventViewModel[],
  auditLog: readonly AuditLogEntry[],
): readonly ReviewExportItem[] {
  return items.map((item) => ({
    id: item.event.id,
    channel: item.event.channel,
    senderName: item.event.senderName,
    senderHandle: item.event.senderHandle,
    receivedAt: item.event.receivedAt,
    message: item.event.message,
    status: item.state.status,
    statusLabel: STATUS_LABELS[item.state.status],
    classification: item.analysis.classification,
    classificationLabel: CLASSIFICATION_LABELS[item.analysis.classification],
    confidence: item.analysis.confidence,
    topic: item.analysis.fields.topic,
    productOrService: item.analysis.fields.productOrService,
    locationOrChannel: item.analysis.fields.locationOrChannel,
    requestedDateTime: item.analysis.fields.requestedDateTime,
    budgetOrPrice: item.analysis.fields.budgetOrPrice,
    contact: item.analysis.fields.contact,
    orderOrReservationRef: item.analysis.fields.orderOrReservationRef,
    missingFields: item.analysis.fields.missing.join("|"),
    draft: item.state.draft,
    mockSendCount: item.state.sentLog.length,
    auditCount: auditCountForEvent(item.event.id, auditLog),
  }))
}

export function buildReviewJsonExport(
  items: readonly EventViewModel[],
  auditLog: readonly AuditLogEntry[],
  sampleScenario: SampleScenario,
): string {
  const payload: ReviewExportPayload = {
    exportedAt: new Date().toISOString(),
    sampleScenario,
    networkPolicy: "browser-download-only",
    items: buildExportItems(items, auditLog),
  }

  return JSON.stringify(payload, null, 2)
}

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function buildReviewCsvExport(
  items: readonly EventViewModel[],
  auditLog: readonly AuditLogEntry[],
): string {
  const rows = buildExportItems(items, auditLog).map((item) => CSV_HEADERS.map((header) => csvCell(item[header])).join(","))
  return [CSV_HEADERS.join(","), ...rows].join("\n")
}
