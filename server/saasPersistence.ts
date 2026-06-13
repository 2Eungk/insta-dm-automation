import { readFile, writeFile } from "node:fs/promises"
import type { SaasSnapshot } from "./saasTypes"

export const EMPTY_SAAS_SNAPSHOT: SaasSnapshot = {
  users: [],
  workspaces: [],
  instagramAccounts: [],
  oauthTokens: [],
  auditLogs: [],
  inboxItems: [],
  replyDrafts: [],
  approvalEvents: [],
  webhookEvents: [],
}

export type SaasStore = {
  readonly read: () => Promise<SaasSnapshot>
  readonly write: (snapshot: SaasSnapshot) => Promise<void>
}

export function createInMemorySaasStore(initial: SaasSnapshot = EMPTY_SAAS_SNAPSHOT): SaasStore {
  let snapshot = initial
  return {
    async read() {
      return snapshot
    },
    async write(nextSnapshot) {
      snapshot = nextSnapshot
    },
  }
}

export function createJsonFileSaasStore(filePath: string): SaasStore {
  return {
    async read() {
      try {
        const raw = await readFile(filePath, "utf8")
        return { ...EMPTY_SAAS_SNAPSHOT, ...JSON.parse(raw) }
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return EMPTY_SAAS_SNAPSHOT
        }
        throw error
      }
    },
    async write(snapshot) {
      await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8")
    },
  }
}
