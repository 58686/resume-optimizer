import { analyzeWithOpenAICompatible } from "@/lib/ai/shared";
import type { AIProvider, AnalyzeInput } from "@/lib/ai/types";

export class OpenAICompatibleProvider implements AIProvider {
  async analyzeResume(input: AnalyzeInput) {
    const { apiKey, model, baseURL, protocol, apiKeyMode, proxy } = input.providerConfig;

    if (!apiKey) {
      throw new Error("Missing API key for the compatible provider.");
    }

    if (!baseURL) {
      throw new Error("Missing base URL for the compatible provider.");
    }

    if (!model) {
      throw new Error("Missing model for the compatible provider.");
    }

    return analyzeWithOpenAICompatible(input, {
      apiKey,
      baseURL,
      model,
      protocol,
      apiKeyMode,
      providerLabel: "OpenAI-compatible provider",
      ...(proxy ? { proxy } : {})
    });
  }
}
