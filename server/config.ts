export type RuntimeEnv = Record<string, string | undefined>

export type SetupError = {
  readonly ok: false
  readonly error: "setup-required"
  readonly message: string
  readonly missing: readonly string[]
  readonly nextStep: string
}

export type InvalidInstagramEmbedUrlError = {
  readonly ok: false
  readonly error: "invalid-instagram-embed-url"
  readonly message: string
  readonly invalid: "META_INSTAGRAM_EMBED_URL"
  readonly nextStep: string
}

export type ConfigError = SetupError | InvalidInstagramEmbedUrlError

export type MetaAccessTokenConfig = {
  readonly accessToken: string
  readonly apiVersion: string
}

export type MetaLongLivedTokenExchangeConfig = {
  readonly accessToken: string
  readonly appSecret: string
}

export type MetaLiveInboxConfig = {
  readonly accessToken: string | undefined
  readonly tokenSource: "long-lived" | "short-lived" | "missing"
  readonly igUserId: string | undefined
  readonly apiVersion: string
}

export type GeneratedMetaOAuthConfig = {
  readonly mode: "generated"
  readonly appId: string
  readonly apiVersion: string
  readonly oauthProvider: MetaOAuthProvider
  readonly redirectUri: string
  readonly scopes: readonly string[]
  readonly state: string
}

export type InstagramEmbedOAuthConfig = {
  readonly mode: "instagram-embed"
  readonly apiVersion: string
  readonly oauthProvider: "instagram"
  readonly redirectUri: string | undefined
  readonly scopes: readonly string[]
  readonly state: string | undefined
  readonly instagramEmbedUrl: string
}

export type MetaOAuthConfig = GeneratedMetaOAuthConfig | InstagramEmbedOAuthConfig

export type MetaOAuthProvider = "facebook" | "instagram"

const DEFAULT_GRAPH_API_VERSION = "v23.0"
const DEFAULT_SCOPES = ["instagram_business_basic", "instagram_business_manage_messages", "pages_show_list"] as const
const SECRET_BEARING_EMBED_PARAMS = new Set(["access_token", "code", "client_secret"])

type ParsedInstagramEmbedUrl = {
  readonly url: string
  readonly hasRedirectUri: boolean
  readonly hasState: boolean
}

function requiredValue(env: RuntimeEnv, name: string): string | undefined {
  const value = env[name]?.trim()
  return value === undefined || value.length === 0 ? undefined : value
}

function isMetaOAuthProvider(value: string): value is MetaOAuthProvider {
  return value === "facebook" || value === "instagram"
}

function inferOAuthProvider(scopes: readonly string[]): MetaOAuthProvider {
  return scopes.some((scope) => scope.startsWith("instagram_business_")) ? "instagram" : "facebook"
}

function readOAuthProvider(env: RuntimeEnv, scopes: readonly string[]): MetaOAuthProvider {
  const configuredProvider = requiredValue(env, "META_OAUTH_PROVIDER")?.toLowerCase()
  if (configuredProvider !== undefined && isMetaOAuthProvider(configuredProvider)) {
    return configuredProvider
  }
  return inferOAuthProvider(scopes)
}

export function missingEnv(env: RuntimeEnv, names: readonly string[]): readonly string[] {
  return names.filter((name) => requiredValue(env, name) === undefined)
}

export function setupError(missing: readonly string[], nextStep: string): SetupError {
  return {
    ok: false,
    error: "setup-required",
    message: `Set ${missing.join(", ")} in your local environment before using this local Step 1 endpoint.`,
    missing,
    nextStep,
  }
}

function invalidInstagramEmbedUrl(message: string): InvalidInstagramEmbedUrlError {
  return {
    ok: false,
    error: "invalid-instagram-embed-url",
    message,
    invalid: "META_INSTAGRAM_EMBED_URL",
    nextStep: "Copy the Embed URL from Meta App Dashboard > Set up business login. Do not paste redirect results, OAuth codes, access tokens, or app secrets.",
  }
}

function hasSecretBearingParam(params: URLSearchParams): boolean {
  for (const [name] of params) {
    if (SECRET_BEARING_EMBED_PARAMS.has(name.toLowerCase())) {
      return true
    }
  }
  return false
}

function readInstagramEmbedUrl(env: RuntimeEnv): ParsedInstagramEmbedUrl | InvalidInstagramEmbedUrlError | undefined {
  const value = requiredValue(env, "META_INSTAGRAM_EMBED_URL")
  if (value === undefined) {
    return undefined
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch (error) {
    if (error instanceof TypeError) {
      return invalidInstagramEmbedUrl("META_INSTAGRAM_EMBED_URL must be a complete HTTPS Instagram authorization URL.")
    }
    throw error
  }

  if (parsed.protocol !== "https:" || parsed.host !== "www.instagram.com" || parsed.pathname !== "/oauth/authorize") {
    return invalidInstagramEmbedUrl("META_INSTAGRAM_EMBED_URL must start with https://www.instagram.com/oauth/authorize.")
  }

  const fragmentParams = new URLSearchParams(parsed.hash.length > 1 ? parsed.hash.slice(1) : "")
  if (hasSecretBearingParam(parsed.searchParams) || hasSecretBearingParam(fragmentParams)) {
    return invalidInstagramEmbedUrl("META_INSTAGRAM_EMBED_URL must not include access_token, code, or client_secret parameters.")
  }

  return {
    url: parsed.toString(),
    hasRedirectUri: parsed.searchParams.has("redirect_uri"),
    hasState: parsed.searchParams.has("state"),
  }
}

export function readOAuthConfig(env: RuntimeEnv): MetaOAuthConfig | ConfigError {
  const scopes = (requiredValue(env, "META_OAUTH_SCOPES")?.split(",") ?? DEFAULT_SCOPES)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0)
  const oauthProvider = readOAuthProvider(env, scopes)
  const apiVersion = requiredValue(env, "META_GRAPH_API_VERSION") ?? DEFAULT_GRAPH_API_VERSION

  if (oauthProvider === "instagram") {
    const embedUrl = readInstagramEmbedUrl(env)
    if (embedUrl !== undefined && "error" in embedUrl) {
      return embedUrl
    }

    if (embedUrl !== undefined) {
      const missing = [
        ...(embedUrl.hasRedirectUri ? [] : missingEnv(env, ["META_REDIRECT_URI"])),
        ...(embedUrl.hasState ? [] : missingEnv(env, ["META_OAUTH_STATE"])),
      ]
      if (missing.length > 0) {
        return setupError(missing, "Set only the redirect_uri and state values missing from the Meta dashboard Embed URL, then export them before running the server.")
      }

      return {
        mode: "instagram-embed",
        apiVersion,
        oauthProvider,
        redirectUri: requiredValue(env, "META_REDIRECT_URI"),
        scopes,
        state: requiredValue(env, "META_OAUTH_STATE"),
        instagramEmbedUrl: embedUrl.url,
      }
    }
  }

  const missing = missingEnv(env, ["META_APP_ID", "META_REDIRECT_URI", "META_OAUTH_STATE"])
  if (missing.length > 0) {
    return setupError(missing, "Copy .env.example to .env locally, fill only your own Meta app values, then export them before running the server.")
  }

  return {
    mode: "generated",
    appId: requiredValue(env, "META_APP_ID") ?? "",
    apiVersion,
    oauthProvider,
    redirectUri: requiredValue(env, "META_REDIRECT_URI") ?? "",
    scopes,
    state: requiredValue(env, "META_OAUTH_STATE") ?? "",
  }
}

export function readVerifyToken(env: RuntimeEnv): string | SetupError {
  const missing = missingEnv(env, ["META_VERIFY_TOKEN"])
  if (missing.length > 0) {
    return setupError(missing, "Set META_VERIFY_TOKEN locally to the same value entered in the Meta webhook subscription screen.")
  }
  return requiredValue(env, "META_VERIFY_TOKEN") ?? ""
}

export function readMetaAccessTokenConfig(env: RuntimeEnv): MetaAccessTokenConfig | SetupError {
  const missing = missingEnv(env, ["META_ACCESS_TOKEN"])
  if (missing.length > 0) {
    return setupError(missing, "Set META_ACCESS_TOKEN only in your local .env, export it into the local server process, and never paste it into source, docs, logs, or tickets.")
  }

  return {
    accessToken: requiredValue(env, "META_ACCESS_TOKEN") ?? "",
    apiVersion: requiredValue(env, "META_GRAPH_API_VERSION") ?? DEFAULT_GRAPH_API_VERSION,
  }
}

export function readMetaLiveInboxConfig(env: RuntimeEnv): MetaLiveInboxConfig {
  const longLivedToken = requiredValue(env, "META_LONG_LIVED_ACCESS_TOKEN")
  const shortLivedToken = requiredValue(env, "META_ACCESS_TOKEN")
  const accessToken = longLivedToken ?? shortLivedToken

  return {
    accessToken,
    tokenSource: longLivedToken !== undefined ? "long-lived" : shortLivedToken !== undefined ? "short-lived" : "missing",
    igUserId: requiredValue(env, "META_IG_USER_ID"),
    apiVersion: requiredValue(env, "META_GRAPH_API_VERSION") ?? DEFAULT_GRAPH_API_VERSION,
  }
}

export function readMetaLongLivedTokenExchangeConfig(env: RuntimeEnv): MetaLongLivedTokenExchangeConfig | SetupError {
  const missing = missingEnv(env, ["META_ACCESS_TOKEN", "META_APP_SECRET"])
  if (missing.length > 0) {
    return setupError(
      missing,
      "Set META_ACCESS_TOKEN and META_APP_SECRET only in your local .env, export them into the local server process, and never paste them into source, docs, logs, or tickets.",
    )
  }

  return {
    accessToken: requiredValue(env, "META_ACCESS_TOKEN") ?? "",
    appSecret: requiredValue(env, "META_APP_SECRET") ?? "",
  }
}
