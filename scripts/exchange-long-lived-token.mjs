import { copyFile, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const DEFAULT_ENV_FILE = ".env"
const TOKEN_KEY = "META_LONG_LIVED_ACCESS_TOKEN"

class CliUsageError extends Error {
  constructor(message) {
    super(message)
    this.name = "CliUsageError"
  }
}

class MetaExchangeError extends Error {
  constructor(message) {
    super(message)
    this.name = "MetaExchangeError"
  }
}

function parseArgs(argv) {
  const envFileFlagIndex = argv.indexOf("--env-file")
  if (envFileFlagIndex === -1) {
    return { envFile: DEFAULT_ENV_FILE }
  }

  const envFile = argv[envFileFlagIndex + 1]
  if (envFile === undefined || envFile.trim().length === 0) {
    throw new CliUsageError("--env-file requires a path.")
  }
  return { envFile }
}

function parseDotEnv(contents) {
  const values = new Map()
  for (const line of contents.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()
    values.set(key, rawValue.replace(/^['"]|['"]$/gu, ""))
  }
  return values
}

function requiredEnv(values, key) {
  const value = values.get(key)?.trim()
  if (value === undefined || value.length === 0) {
    throw new CliUsageError(`Set ${key} in local .env before running this command.`)
  }
  return value
}

function sanitizeMessage(message, secrets) {
  return secrets.reduce((sanitized, secret) => sanitized.replaceAll(secret, "[redacted]"), message)
}

function buildExchangeUrl(accessToken, appSecret) {
  const url = new URL("https://graph.instagram.com/access_token")
  url.searchParams.set("grant_type", "ig_exchange_token")
  url.searchParams.set("client_secret", appSecret)
  url.searchParams.set("access_token", accessToken)
  return url
}

async function requestLongLivedToken({ accessToken, appSecret, fetchImpl }) {
  const response = await fetchImpl(buildExchangeUrl(accessToken, appSecret), { method: "GET" })
  const payload = await response.json()

  if (!response.ok) {
    const message = typeof payload?.error?.message === "string" ? payload.error.message : "Meta rejected the long-lived token exchange request."
    throw new MetaExchangeError(sanitizeMessage(message, [accessToken, appSecret]))
  }

  if (typeof payload?.access_token !== "string" || payload.access_token.length === 0) {
    throw new MetaExchangeError("Meta response did not include a long-lived access token.")
  }

  return {
    token: payload.access_token,
    expiresInSeconds: typeof payload.expires_in === "number" ? payload.expires_in : undefined,
  }
}

function updateEnvContents(contents, token) {
  const lines = contents.split(/\r?\n/u)
  let updated = false
  const nextLines = lines.map((line) => {
    if (line.startsWith(`${TOKEN_KEY}=`)) {
      updated = true
      return `${TOKEN_KEY}=${token}`
    }
    return line
  })

  if (!updated) {
    const suffix = contents.endsWith("\n") ? "" : "\n"
    return `${nextLines.join("\n")}${suffix}${TOKEN_KEY}=${token}\n`
  }

  return nextLines.join("\n")
}

async function writeEnvWithBackup(envFile, nextContents) {
  const envPath = resolve(envFile)
  const backupPath = resolve(dirname(envPath), ".env.bak")
  const tempPath = resolve(dirname(envPath), ".env.tmp")
  await copyFile(envPath, backupPath)
  await writeFile(tempPath, nextContents, { mode: 0o600 })
  await rename(tempPath, envPath)
  return backupPath
}

export async function exchangeAndWriteLongLivedToken({ envFile, fetchImpl = fetch, stdout = process.stdout }) {
  const envPath = resolve(envFile)
  const contents = await readFile(envPath, "utf8")
  const values = parseDotEnv(contents)
  const accessToken = requiredEnv(values, "META_ACCESS_TOKEN")
  const appSecret = requiredEnv(values, "META_APP_SECRET")
  const result = await requestLongLivedToken({ accessToken, appSecret, fetchImpl })
  const backupPath = await writeEnvWithBackup(envPath, updateEnvContents(contents, result.token))

  stdout.write("Received a long-lived token and updated .env without printing it.\n")
  stdout.write(`Backup written to ${backupPath}.\n`)
  if (result.expiresInSeconds !== undefined) {
    stdout.write(`expiresInSeconds=${result.expiresInSeconds}\n`)
  }

  return { backupPath, expiresInSeconds: result.expiresInSeconds }
}

async function main() {
  try {
    const { envFile } = parseArgs(process.argv.slice(2))
    await exchangeAndWriteLongLivedToken({ envFile })
  } catch (error) {
    if (error instanceof CliUsageError || error instanceof MetaExchangeError) {
      process.stderr.write(`${error.message}\n`)
      process.exitCode = 1
      return
    }
    throw error
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  await main()
}
