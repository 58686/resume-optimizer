import type { AnalysisResult } from "@/types/analysis";

export type AIProviderId =
  | "openai"
  | "openrouter"
  | "compatible"
  | "nvidia"
  | "gemini"
  | "anthropic";

export type AIProtocol = "responses" | "chat_completions";
export type AIApiKeyMode = "bearer" | "api_key_header" | "x_api_key_header";

export function getDefaultProtocolForProvider(provider: AIProviderId): AIProtocol {
  switch (provider) {
    case "compatible":
    case "nvidia":
    case "gemini":
    case "anthropic":
      return "chat_completions";
    case "openrouter":
    case "openai":
    default:
      return "responses";
  }
}

export function getDefaultApiKeyModeForProvider(provider: AIProviderId): AIApiKeyMode {
  switch (provider) {
    case "anthropic":
      return "x_api_key_header";
    case "openai":
    case "openrouter":
    case "compatible":
    case "nvidia":
    case "gemini":
    default:
      return "bearer";
  }
}

export type AIProviderConfig = {
  provider: AIProviderId;
  protocol: AIProtocol;
  apiKeyMode: AIApiKeyMode;
  apiKey: string;
  model: string;
  baseURL?: string;
  siteUrl?: string;
  appName?: string;
  proxy?: string;
};

export type AIProviderConfigInput = Partial<AIProviderConfig> & {
  provider: AIProviderId;
};

export type AIProviderConfigSnapshot = {
  protocol?: AIProtocol;
  apiKeyMode?: AIApiKeyMode;
  apiKey?: string;
  baseURL?: string;
  siteUrl?: string;
  appName?: string;
  proxy?: string;
};

export type AnalyzeInput = {
  resumeText: string;
  jobDescription: string;
  providerConfig: AIProviderConfig;
};

export interface AIProvider {
  analyzeResume(input: AnalyzeInput): Promise<AnalysisResult>;
}
