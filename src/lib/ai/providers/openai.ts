import { analyzeWithOpenAICompatible } from "@/lib/ai/shared";
import type { AIProvider, AnalyzeInput } from "@/lib/ai/types";

export class OpenAIProvider implements AIProvider {
  async analyzeResume(input: AnalyzeInput) {
    const { apiKey, model, protocol, apiKeyMode, proxy } = input.providerConfig;

    if (!apiKey) {
      throw new Error("Missing API key for OpenAI.");
    }

    if (!model) {
      throw new Error("Missing model for OpenAI.");
    }

    return analyzeWithOpenAICompatible(input, {
      apiKey,
      model,
      protocol,
      apiKeyMode,
      providerLabel: "OpenAI",
      ...(proxy ? { proxy } : {})
    });
  }
}
