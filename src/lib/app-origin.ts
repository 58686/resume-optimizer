import { env, normalizeOptional } from "@/lib/env";

export function resolveAppOrigin(request?: Request) {
  const configuredOrigin = normalizeOptional(env.APP_ORIGIN);

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}
