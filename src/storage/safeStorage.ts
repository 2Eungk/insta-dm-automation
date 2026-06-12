type StorageReadResult =
  | {
      readonly kind: "available"
      readonly value: string | null
    }
  | {
      readonly kind: "unavailable"
      readonly reason: string
    }

export function readLocalStorage(key: string): StorageReadResult {
  try {
    return { kind: "available", value: window.localStorage.getItem(key) }
  } catch (error) {
    if (error instanceof Error) {
      return { kind: "unavailable", reason: error.message }
    }
    throw error
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (error) {
    if (error instanceof Error) {
      return false
    }
    throw error
  }
}
