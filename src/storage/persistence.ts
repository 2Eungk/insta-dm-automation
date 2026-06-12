import { z } from "zod"
import type {
  AuditAction,
  AuditLogEntry,
  EventState,
  ReplyTone,
  SampleScenario,
  SendLogEntry,
  Status,
  UserPreferences,
  WorkspacePreset,
} from "../domain/types"
import { SAMPLE_SCENARIOS } from "../domain/types"
import { readLocalStorage, writeLocalStorage } from "./safeStorage"

const STORAGE_KEY = "insta-dm-automation:event-state:v2"
const PREFERENCES_KEY = "insta-dm-automation:preferences:v1"
const AUDIT_LOG_KEY = "insta-dm-automation:audit-log:v1"
const SAMPLE_SCENARIO_KEY = "insta-dm-automation:sample-scenario:v1"
const ONBOARDING_VISIBLE_KEY = "insta-dm-automation:onboarding-visible:v1"

const statusSchema = z.enum(["new", "drafted", "approved", "hold", "ignored"])
const sendLogSchema = z.object({
  at: z.string(),
  text: z.string(),
})

const eventStateSchema = z.object({
  status: statusSchema,
  draft: z.string(),
  sentLog: z.array(sendLogSchema),
})

const storedStateSchema = z.record(z.string(), eventStateSchema)
const userPreferencesSchema = z.object({
  workspacePreset: z.enum(["generic", "ecommerce", "bookingService", "creatorCommunity", "customerSupport"]),
  replyTone: z.enum(["friendly", "concise", "professional", "casual"]),
})
const auditActionSchema = z.enum(["status-change", "draft-regenerated", "mock-send", "sample-reset"])
const auditLogEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  action: auditActionSchema,
  eventIds: z.array(z.string()),
  summary: z.string(),
})
const auditLogSchema = z.array(auditLogEntrySchema)
const sampleScenarioSchema = z.enum(SAMPLE_SCENARIOS)
const onboardingVisibleSchema = z.boolean()

export type StoredState = Readonly<Record<string, EventState>>
export type StoredAuditLog = readonly AuditLogEntry[]
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  workspacePreset: "generic",
  replyTone: "friendly",
}

export function loadStoredState(): StoredState {
  const stored = readLocalStorage(STORAGE_KEY)
  const raw = stored.kind === "available" ? stored.value : null
  if (raw === null) {
    return {}
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {}
    }
    throw error
  }

  const parsed = storedStateSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return {}
  }

  return parsed.data
}

export function saveStoredState(state: StoredState): void {
  writeLocalStorage(STORAGE_KEY, JSON.stringify(state))
}

export function removeStoredStateForEventIds(state: StoredState, eventIds: readonly string[]): StoredState {
  const eventIdSet = new Set(eventIds)
  return Object.fromEntries(Object.entries(state).filter(([eventId]) => !eventIdSet.has(eventId)))
}

export function createState(status: Status, draft: string, sentLog: readonly SendLogEntry[]): EventState {
  return { status, draft, sentLog }
}

export function loadUserPreferences(): UserPreferences {
  const stored = readLocalStorage(PREFERENCES_KEY)
  const raw = stored.kind === "available" ? stored.value : null
  if (raw === null) {
    return DEFAULT_USER_PREFERENCES
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return DEFAULT_USER_PREFERENCES
    }
    throw error
  }

  const parsed = userPreferencesSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return DEFAULT_USER_PREFERENCES
  }

  return parsed.data
}

export function saveUserPreferences(preferences: UserPreferences): void {
  writeLocalStorage(PREFERENCES_KEY, JSON.stringify(preferences))
}

export function createUserPreferences(workspacePreset: WorkspacePreset, replyTone: ReplyTone): UserPreferences {
  return { workspacePreset, replyTone }
}

export function loadAuditLog(): StoredAuditLog {
  const stored = readLocalStorage(AUDIT_LOG_KEY)
  const raw = stored.kind === "available" ? stored.value : null
  if (raw === null) {
    return []
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return []
    }
    throw error
  }

  const parsed = auditLogSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return []
  }

  return parsed.data
}

export function saveAuditLog(entries: StoredAuditLog): void {
  writeLocalStorage(AUDIT_LOG_KEY, JSON.stringify(entries))
}

export function removeAuditLogForEventIds(entries: StoredAuditLog, eventIds: readonly string[]): StoredAuditLog {
  const eventIdSet = new Set(eventIds)
  return entries.filter((entry) => !entry.eventIds.some((eventId) => eventIdSet.has(eventId)))
}

export function createAuditLogEntry(
  action: AuditAction,
  eventIds: readonly string[],
  summary: string,
): AuditLogEntry {
  return {
    id: `${Date.now()}-${action}-${eventIds.join("-")}`,
    at: new Date().toISOString(),
    action,
    eventIds,
    summary,
  }
}

export function loadSampleScenario(): SampleScenario {
  const stored = readLocalStorage(SAMPLE_SCENARIO_KEY)
  const raw = stored.kind === "available" ? stored.value : null
  const parsed = sampleScenarioSchema.safeParse(raw)
  return parsed.success ? parsed.data : "generic"
}

export function saveSampleScenario(sampleScenario: SampleScenario): void {
  writeLocalStorage(SAMPLE_SCENARIO_KEY, sampleScenario)
}

export function loadOnboardingVisible(): boolean {
  const stored = readLocalStorage(ONBOARDING_VISIBLE_KEY)
  const raw = stored.kind === "available" ? stored.value : null
  if (raw === null) {
    return true
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return true
    }
    throw error
  }

  const parsed = onboardingVisibleSchema.safeParse(parsedJson)
  return parsed.success ? parsed.data : true
}

export function saveOnboardingVisible(isVisible: boolean): void {
  writeLocalStorage(ONBOARDING_VISIBLE_KEY, JSON.stringify(isVisible))
}
