import { analyzeWithOpenAICompatible } from "@/lib/ai/shared";
import type { AIProvider, AnalyzeInput } from "@/lib/ai/types";

export class OpenRouterProvider implements AIProvider {
  async analyzeResume(input: AnalyzeInput) {
    const { apiKey, model, baseURL, siteUrl, appName, protocol, apiKeyMode, proxy } = input.providerConfig;

    if (!apiKey) {
      throw new Error("Missing API key for OpenRouter.");
    }

    if (!model) {
      throw new Error("Missing model for OpenRouter.");
    }

    return analyzeWithOpenAICompatible(input, {
      apiKey,
      baseURL: baseURL || "https://openrouter.ai/api/v1",
      model,
      protocol,
      apiKeyMode,
      providerLabel: "OpenRouter",
      defaultHeaders: {
        ...(siteUrl ? { Referer: siteUrl } : {}),
        ...(appName ? { "X-Title": appName } : {})
      },
      ...(proxy ? { proxy } : {})
    });
  }
}
