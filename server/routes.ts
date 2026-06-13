import { CORS_PREFLIGHT_HEADERS, json } from "./http"
import { createDefaultInstagramFetch, instagramMe } from "./instagramTokenStatus"
import { createDefaultLiveInboxFetch, liveInboxDiagnostics } from "./instagramLiveInbox"
import { createDefaultLongLivedTokenExchangeFetch } from "./metaLongLivedTokenExchange"
import { routeMetaSetupRequest } from "./metaSetupRoutes"
import { routeSaasRequest } from "./saasRoutes"
import type { RuntimeEnv } from "./config"
import type { RouteRequest, ResponsePayload } from "./http"
import type { InstagramTokenStatusDependencies } from "./instagramTokenStatus"
import type { LiveInboxDependencies } from "./instagramLiveInbox"
import type { LongLivedTokenExchangeDependencies } from "./metaLongLivedTokenExchange"
import type { SaasRouteDependencies } from "./saasRoutes"

export type RouteDependencies = {
  readonly instagramTokenStatus?: InstagramTokenStatusDependencies
  readonly liveInbox?: LiveInboxDependencies
  readonly longLivedTokenExchange?: LongLivedTokenExchangeDependencies
  readonly saas?: SaasRouteDependencies
}

function defaultDependencies(): Required<RouteDependencies> {
  return {
    instagramTokenStatus: { fetch: createDefaultInstagramFetch() },
    liveInbox: { fetch: createDefaultLiveInboxFetch() },
    longLivedTokenExchange: { fetch: createDefaultLongLivedTokenExchangeFetch() },
    saas: {},
  }
}

function routeNotFound(): ResponsePayload {
  return json(404, {
    ok: false,
    error: "not-found",
    message: "Route is not available in the local Meta backend.",
  })
}

export async function routeMetaRequest(
  request: RouteRequest,
  env: RuntimeEnv,
  dependencies: RouteDependencies = defaultDependencies(),
): Promise<ResponsePayload> {
  const path = request.url.pathname
  const instagramTokenStatus = dependencies.instagramTokenStatus ?? { fetch: createDefaultInstagramFetch() }
  const liveInbox = dependencies.liveInbox ?? { fetch: createDefaultLiveInboxFetch() }
  const longLivedTokenExchange = dependencies.longLivedTokenExchange ?? { fetch: createDefaultLongLivedTokenExchangeFetch() }

  if (request.method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_PREFLIGHT_HEADERS, body: "" }
  }
  if (request.method === "GET" && (path === "/instagram/me" || path === "/auth/meta/token-status")) {
    return instagramMe(env, instagramTokenStatus)
  }
  if (request.method === "GET" && (path === "/instagram/live-inbox" || path === "/auth/meta/live-inbox")) {
    return liveInboxDiagnostics(env, liveInbox)
  }

  const saasRoute = routeSaasRequest(request, env, dependencies.saas)
  if (saasRoute !== undefined) {
    return saasRoute
  }

  const setupRoute = routeMetaSetupRequest(request, env, longLivedTokenExchange)
  return setupRoute ?? routeNotFound()
}
