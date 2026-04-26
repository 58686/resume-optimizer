import {
  getDefaultApiKeyModeForProvider,
  getDefaultProtocolForProvider,
  type AIApiKeyMode,
  type AIProtocol,
  type AIProviderId
} from "@/lib/ai/types";

export type ProviderFormValues = {
  protocol: AIProtocol;
  apiKeyMode: AIApiKeyMode;
  apiKey: string;
  model: string;
  baseURL: string;
  siteUrl: string;
  appName: string;
  proxy: string;
};

export type ProviderProfileMeta = {
  hasApiKey: boolean;
  isSaved: boolean;
};

export const PROVIDER_IDS: AIProviderId[] = [
  "openai",
  "openrouter",
  "nvidia",
  "gemini",
  "anthropic",
  "compatible"
];

export function getProviderLabel(provider: AIProviderId) {
  switch (provider) {
    case "openai":
      return "OpenAI";
    case "openrouter":
      return "OpenRouter";
    case "nvidia":
      return "NVIDIA";
    case "gemini":
      return "Gemini";
    case "anthropic":
      return "Anthropic";
    case "compatible":
    default:
      return "OpenAI-Compatible";
  }
}

export function getDefaultModel(provider: AIProviderId) {
  switch (provider) {
    case "openrouter":
      return "openai/gpt-4.1-mini";
    case "nvidia":
      return "meta/llama-3.1-70b-instruct";
    case "gemini":
      return "gemini-2.5-flash";
    case "anthropic":
      return "claude-sonnet-4-20250514";
    case "compatible":
      return "gpt-4.1-mini";
    case "openai":
    default:
      return "gpt-4.1-mini";
  }
}

export function getDefaultBaseURL(provider: AIProviderId) {
  switch (provider) {
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "nvidia":
      return "https://integrate.api.nvidia.com/v1";
    case "gemini":
      return "https://generativelanguage.googleapis.com/v1beta/openai/";
    case "anthropic":
      return "https://api.anthropic.com/v1";
    case "compatible":
      return "";
    case "openai":
    default:
      return "";
  }
}

export function getSupportedProtocols(provider: AIProviderId): AIProtocol[] {
  switch (provider) {
    case "gemini":
    case "anthropic":
      return ["chat_completions"];
    case "openai":
    case "openrouter":
    case "compatible":
    case "nvidia":
    default:
      return ["chat_completions", "responses"];
  }
}

export function providerSupportsProtocolSelection(provider: AIProviderId) {
  return provider !== "anthropic";
}

export function providerSupportsApiKeyModeSelection(provider: AIProviderId) {
  return provider === "compatible";
}

export function providerSupportsSiteMetadata(provider: AIProviderId) {
  return provider === "openrouter";
}

export function providerSupportsBaseURL(provider: AIProviderId) {
  return provider !== "openai";
}

export function getDefaultProviderValues(provider: AIProviderId): ProviderFormValues {
  return {
    protocol: getDefaultProtocolForProvider(provider),
    apiKeyMode: getDefaultApiKeyModeForProvider(provider),
    apiKey: "",
    model: getDefaultModel(provider),
    baseURL: getDefaultBaseURL(provider),
    siteUrl: "",
    appName: "resume-optimizer",
    proxy: ""
  };
}

export function createDefaultProviderValuesMap(): Record<AIProviderId, ProviderFormValues> {
  return {
    openai: getDefaultProviderValues("openai"),
    openrouter: getDefaultProviderValues("openrouter"),
    nvidia: getDefaultProviderValues("nvidia"),
    gemini: getDefaultProviderValues("gemini"),
    anthropic: getDefaultProviderValues("anthropic"),
    compatible: getDefaultProviderValues("compatible")
  };
}

export function createDefaultProviderMetaMap(): Record<AIProviderId, ProviderProfileMeta> {
  return {
    openai: { hasApiKey: false, isSaved: false },
    openrouter: { hasApiKey: false, isSaved: false },
    nvidia: { hasApiKey: false, isSaved: false },
    gemini: { hasApiKey: false, isSaved: false },
    anthropic: { hasApiKey: false, isSaved: false },
    compatible: { hasApiKey: false, isSaved: false }
  };
}
