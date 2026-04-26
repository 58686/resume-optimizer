import { analyzeWithOpenAICompatible } from "@/lib/ai/shared";
import type { AIProvider, AnalyzeInput } from "@/lib/ai/types";

export class NvidiaProvider implements AIProvider {
  async analyzeResume(input: AnalyzeInput) {
    const { apiKey, model, baseURL, protocol, apiKeyMode, proxy } = input.providerConfig;

    if (!apiKey) {
      throw new Error("Missing API key for NVIDIA.");
    }

    if (!model) {
      throw new Error("Missing model for NVIDIA.");
    }

    return analyzeWithOpenAICompatible(input, {
      apiKey,
      baseURL: baseURL || "https://integrate.api.nvidia.com/v1",
      model,
      protocol,
      apiKeyMode,
      providerLabel: "NVIDIA",
      ...(proxy ? { proxy } : {})
    });
  }
}
