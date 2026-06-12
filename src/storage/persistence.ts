import { z } from "zod"
import type { EventState, ReplyTone, SendLogEntry, Status, UserPreferences, WorkspacePreset } from "../domain/types"

const STORAGE_KEY = "insta-dm-automation:event-state:v2"
const PREFERENCES_KEY = "insta-dm-automation:preferences:v1"

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

export type StoredState = Readonly<Record<string, EventState>>
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  workspacePreset: "generic",
  replyTone: "friendly",
}

export function loadStoredState(): StoredState {
  const raw = window.localStorage.getItem(STORAGE_KEY)
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function createState(status: Status, draft: string, sentLog: readonly SendLogEntry[]): EventState {
  return { status, draft, sentLog }
}

export function loadUserPreferences(): UserPreferences {
  const raw = window.localStorage.getItem(PREFERENCES_KEY)
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
  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
}

export function createUserPreferences(workspacePreset: WorkspacePreset, replyTone: ReplyTone): UserPreferences {
  return { workspacePreset, replyTone }
}
