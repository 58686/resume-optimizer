import { apiError } from "@/lib/api-response";
import { env, normalizeOptional } from "@/lib/env";

const CSRF_PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(value: string) {
  return new URL(value).origin.toLowerCase();
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function getRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedProtocol = getFirstHeaderValue(request.headers.get("x-forwarded-proto"));
  const forwardedHost = getFirstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProtocol || requestUrl.protocol.replace(/:$/, "");

  return normalizeOrigin(`${protocol}://${host}`);
}

function getAllowedOrigins(request: Request) {
  const configuredOrigin = normalizeOptional(env.APP_ORIGIN);
  const origins = new Set<string>([getRequestOrigin(request)]);

  if (configuredOrigin) {
    origins.add(normalizeOrigin(configuredOrigin));
  }

  return origins;
}

function getSourceOrigin(request: Request) {
  const originHeader = normalizeOptional(request.headers.get("origin") ?? undefined);

  if (originHeader) {
    return normalizeOrigin(originHeader);
  }

  const refererHeader = normalizeOptional(request.headers.get("referer") ?? undefined);

  if (!refererHeader) {
    return null;
  }

  return normalizeOrigin(refererHeader);
}

export function requireCsrfProtection(request: Request) {
  if (!CSRF_PROTECTED_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  try {
    const sourceOrigin = getSourceOrigin(request);

    if (!sourceOrigin) {
      return apiError("缺少 Origin 或 Referer，请求已被拒绝。", 403, "CSRF_ORIGIN_REQUIRED");
    }

    const allowedOrigins = getAllowedOrigins(request);

    if (!allowedOrigins.has(sourceOrigin)) {
      return apiError("请求来源校验失败，请重试。", 403, "CSRF_ORIGIN_INVALID");
    }

    return null;
  } catch {
    return apiError("请求来源校验失败，请重试。", 403, "CSRF_ORIGIN_INVALID");
  }
}
