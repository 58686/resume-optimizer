function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, " "));
}

function isHtmlPayload(value: string) {
  return /<!doctype html|<html[\s>]|<body[\s>]|<head[\s>]|<meta[\s>]|<style[\s>]|<svg[\s>]/i.test(value);
}

function extractNestedMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.message || String(value);
  }

  if (isObject(value)) {
    if (typeof value.message === "string") {
      return value.message;
    }

    if (isObject(value.error) && typeof value.error.message === "string") {
      return value.error.message;
    }

    if (typeof value.error === "string") {
      return value.error;
    }

    if (value.cause) {
      return extractNestedMessage(value.cause);
    }
  }

  return null;
}

function extractStatus(value: unknown) {
  if (isObject(value) && typeof value.status === "number") {
    return value.status;
  }

  return null;
}

function cleanRawMessage(message: string) {
  const stripped = isHtmlPayload(message) ? stripHtml(message) : normalizeWhitespace(message);
  return stripped.replace(/^\d{3}\s+/, "").trim();
}

function truncate(value: string, maxLength = 220) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function mapKnownRawMessage(message: string, providerLabel: string) {
  if (/cloudflare_challenge|chatgpt challenge detected/i.test(message)) {
    return `${providerLabel} 上游触发了 Cloudflare 挑战。若这是自定义兼容供应商，请把协议切换到 Chat Completions，或更换稳定的 API 网关。`;
  }

  if (/\/v1\/responses/i.test(message) && /403|upstream server error|challenge/i.test(message)) {
    return `${providerLabel} 当前拦截了 /v1/responses 请求。请尝试把协议切换到 Chat Completions。`;
  }

  if (/did not return a parsed analysis result/i.test(message)) {
    return `${providerLabel} 返回了无法解析的结果，请更换模型或稍后重试。`;
  }

  if (/request timed out|timeout/i.test(message)) {
    return `${providerLabel} 响应超时，请稍后重试。`;
  }

  if (/rate limit|too many requests/i.test(message)) {
    return `${providerLabel} 当前请求过多，请稍后重试。`;
  }

  if (/missing api key/i.test(message)) {
    return `${providerLabel} 缺少 API Key，请检查配置。`;
  }

  if (/missing base url/i.test(message)) {
    return `${providerLabel} 缺少 Base URL，请检查配置。`;
  }

  if (/missing model/i.test(message)) {
    return `${providerLabel} 缺少模型名称，请检查配置。`;
  }

  if (/upstream server error|bad gateway|gateway timeout|temporarily unavailable/i.test(message)) {
    return `${providerLabel} 上游服务暂时异常，请稍后重试。`;
  }

  if (isHtmlPayload(message)) {
    return `${providerLabel} 上游服务返回了异常页面，请检查 Base URL 或稍后重试。`;
  }

  return null;
}

function mapStatusMessage(status: number, providerLabel: string) {
  if (status === 401 || status === 403) {
    return `${providerLabel} 认证失败，请检查 API Key 和权限配置。`;
  }

  if (status === 404) {
    return `${providerLabel} 接口地址或模型名称无效，请检查 Base URL 和模型配置。`;
  }

  if (status === 408) {
    return `${providerLabel} 响应超时，请稍后重试。`;
  }

  if (status === 429) {
    return `${providerLabel} 当前请求过多，请稍后重试。`;
  }

  if (status >= 500) {
    return `${providerLabel} 上游服务暂时异常，请稍后重试。`;
  }

  return null;
}

export function getProviderDisplayName(provider: string) {
  switch (provider) {
    case "nvidia":
      return "NVIDIA";
    case "gemini":
      return "Gemini";
    case "anthropic":
      return "Anthropic";
    case "openrouter":
      return "OpenRouter";
    case "compatible":
      return "兼容模型服务";
    case "openai":
    default:
      return "OpenAI";
  }
}

export function getUserFacingModelError(error: unknown, providerLabel: string) {
  const rawMessage = extractNestedMessage(error);
  const status = extractStatus(error);

  if (typeof status === "number") {
    const mappedByStatus = mapStatusMessage(status, providerLabel);
    if (mappedByStatus) {
      return mappedByStatus;
    }
  }

  if (rawMessage) {
    const mappedByMessage = mapKnownRawMessage(rawMessage, providerLabel);
    if (mappedByMessage) {
      return mappedByMessage;
    }

    const cleaned = cleanRawMessage(rawMessage);
    if (cleaned) {
      return `${providerLabel} 请求失败：${truncate(cleaned)}`;
    }
  }

  return `${providerLabel} 分析失败，请稍后重试。`;
}

export function formatVisibleErrorMessage(message: string | null | undefined) {
  if (!message) {
    return "";
  }

  const mapped = mapKnownRawMessage(message, "模型服务");
  if (mapped) {
    return mapped;
  }

  const cleaned = cleanRawMessage(message);
  return truncate(cleaned || "处理失败，请稍后重试。", 260);
}
