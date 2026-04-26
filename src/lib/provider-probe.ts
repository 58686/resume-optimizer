import OpenAI from "openai";
import {
  getDefaultApiKeyModeForProvider,
  type AIApiKeyMode,
  type AIProviderConfig,
  type AIProviderConfigInput
} from "@/lib/ai/types";
import { resolveProviderConfig } from "@/lib/env";

type OpenAICompatibleProbeConfig = {
  apiKey: string;
  baseURL?: string;
  apiKeyMode: AIApiKeyMode;
  defaultHeaders?: Record<string, string>;
  proxy?: string;
};

function applyApiKeyHeader(headers: Headers, apiKey: string, apiKeyMode: AIApiKeyMode) {
  headers.delete("authorization");

  switch (apiKeyMode) {
    case "api_key_header":
      headers.set("api-key", apiKey);
      headers.delete("x-api-key");
      break;
    case "x_api_key_header":
      headers.set("x-api-key", apiKey);
      headers.delete("api-key");
      break;
    case "bearer":
    default:
      headers.set("authorization", `Bearer ${apiKey}`);
      headers.delete("api-key");
      headers.delete("x-api-key");
      break;
  }
}

function createFetch(config: OpenAICompatibleProbeConfig): typeof fetch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dispatcher = config.proxy ? new (require("undici").ProxyAgent)(config.proxy) : undefined;

  return async (input, init) => {
    const needsCustomAuth = config.apiKeyMode !== "bearer";

    if (!needsCustomAuth && !dispatcher) {
      return fetch(input, init);
    }

    const request = new Request(input as RequestInfo, init);
    const headers = new Headers(request.headers);

    if (needsCustomAuth) {
      applyApiKeyHeader(headers, config.apiKey, config.apiKeyMode);
    }

    const fetchInit: RequestInit & { dispatcher?: unknown } = {
      method: request.method,
      headers,
      body: request.body,
      // @ts-expect-error - duplex is required for streaming request bodies in Node fetch
      duplex: "half"
    };
    if (dispatcher) {
      fetchInit.dispatcher = dispatcher;
    }

    return fetch(input as RequestInfo, fetchInit as RequestInit);
  };
}

function createProxyFetch(proxy: string): typeof fetch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dispatcher = new (require("undici").ProxyAgent)(proxy);
  return (input, init) => {
    return fetch(input as RequestInfo, { ...init, dispatcher } as RequestInit);
  };
}

function createOpenAICompatibleClient(config: OpenAICompatibleProbeConfig) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
    fetch: createFetch(config)
  });
}

async function probeAnthropic(config: AIProviderConfig) {
  const proxyFetch = config.proxy ? createProxyFetch(config.proxy) : fetch;
  const response = await proxyFetch(`${config.baseURL!.replace(/\/$/, "")}/models`, {
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01"
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message || "Anthropic connectivity test failed.");
  }

  return {
    ok: true,
    provider: config.provider,
    baseURL: config.baseURL!,
    model: config.model,
    message: "Anthropic connectivity test passed."
  };
}

async function listAnthropicModels(config: AIProviderConfig) {
  const proxyFetch = config.proxy ? createProxyFetch(config.proxy) : fetch;
  const response = await proxyFetch(`${config.baseURL!.replace(/\/$/, "")}/models`, {
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01"
    }
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: Array<{ id?: string }>; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Anthropic model listing failed.");
  }

  return (payload?.data ?? []).map((item) => item.id).filter((value): value is string => Boolean(value));
}

async function probeOpenAICompatible(config: AIProviderConfig) {
  const defaultHeaders =
    config.provider === "openrouter"
      ? {
          ...(config.siteUrl ? { Referer: config.siteUrl } : {}),
          ...(config.appName ? { "X-Title": config.appName } : {})
        }
      : undefined;

  const client = createOpenAICompatibleClient({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    apiKeyMode: config.apiKeyMode,
    defaultHeaders,
    proxy: config.proxy
  });

  await client.models.list();

  return {
    ok: true,
    provider: config.provider,
    baseURL: config.baseURL ?? "https://api.openai.com/v1",
    model: config.model,
    message: "Connectivity test passed."
  };
}

async function listOpenAICompatibleModels(config: AIProviderConfig) {
  const defaultHeaders =
    config.provider === "openrouter"
      ? {
          ...(config.siteUrl ? { Referer: config.siteUrl } : {}),
          ...(config.appName ? { "X-Title": config.appName } : {})
        }
      : undefined;

  const client = createOpenAICompatibleClient({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    apiKeyMode: config.apiKeyMode,
    defaultHeaders,
    proxy: config.proxy
  });

  const response = await client.models.list();
  return response.data.map((item) => item.id).filter(Boolean);
}

export function resolveProbeProviderConfig(input: AIProviderConfigInput) {
  return resolveProviderConfig({
    ...input,
    apiKeyMode: input.apiKeyMode ?? getDefaultApiKeyModeForProvider(input.provider)
  });
}

export async function testProviderConnection(config: AIProviderConfig) {
  switch (config.provider) {
    case "anthropic":
      return probeAnthropic(config);
    case "openai":
    case "openrouter":
    case "compatible":
    case "nvidia":
    case "gemini":
    default:
      return probeOpenAICompatible(config);
  }
}

export async function listProviderModels(config: AIProviderConfig) {
  switch (config.provider) {
    case "anthropic":
      return listAnthropicModels(config);
    case "openai":
    case "openrouter":
    case "compatible":
    case "nvidia":
    case "gemini":
    default:
      return listOpenAICompatibleModels(config);
  }
}

