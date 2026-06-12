export type RuntimeEnv = Record<string, string | undefined>

export type SetupError = {
  readonly ok: false
  readonly error: "setup-required"
  readonly message: string
  readonly missing: readonly string[]
  readonly nextStep: string
}

export type MetaOAuthConfig = {
  readonly appId: string
  readonly apiVersion: string
  readonly oauthProvider: MetaOAuthProvider
  readonly redirectUri: string
  readonly scopes: readonly string[]
  readonly state: string
}

export type MetaOAuthProvider = "facebook" | "instagram"

const DEFAULT_GRAPH_API_VERSION = "v23.0"
const DEFAULT_SCOPES = ["instagram_business_basic", "instagram_business_manage_messages", "pages_show_list"] as const

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

export function readOAuthConfig(env: RuntimeEnv): MetaOAuthConfig | SetupError {
  const missing = missingEnv(env, ["META_APP_ID", "META_REDIRECT_URI", "META_OAUTH_STATE"])
  if (missing.length > 0) {
    return setupError(missing, "Copy .env.example to .env locally, fill only your own Meta app values, then export them before running the server.")
  }

  const scopes = (requiredValue(env, "META_OAUTH_SCOPES")?.split(",") ?? DEFAULT_SCOPES)
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0)

  return {
    appId: requiredValue(env, "META_APP_ID") ?? "",
    apiVersion: requiredValue(env, "META_GRAPH_API_VERSION") ?? DEFAULT_GRAPH_API_VERSION,
    oauthProvider: readOAuthProvider(env, scopes),
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
