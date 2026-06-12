import { z } from "zod"
import type { EventState, SendLogEntry, Status } from "../domain/types"

const STORAGE_KEY = "insta-dm-automation:event-state:v1"

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

export type StoredState = Readonly<Record<string, EventState>>

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
