import { analyzeWithOpenAICompatible } from "@/lib/ai/shared";
import type { AIProvider, AnalyzeInput } from "@/lib/ai/types";

export class GeminiProvider implements AIProvider {
  async analyzeResume(input: AnalyzeInput) {
    const { apiKey, model, baseURL, protocol, apiKeyMode, proxy } = input.providerConfig;

    if (!apiKey) {
      throw new Error("Missing API key for Gemini.");
    }

    if (!model) {
      throw new Error("Missing model for Gemini.");
    }

    return analyzeWithOpenAICompatible(input, {
      apiKey,
      baseURL: baseURL || "https://generativelanguage.googleapis.com/v1beta/openai/",
      model,
      protocol,
      apiKeyMode,
      providerLabel: "Gemini",
      ...(proxy ? { proxy } : {})
    });
  }
}
