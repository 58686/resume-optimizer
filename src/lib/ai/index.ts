import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { OpenAICompatibleProvider } from "@/lib/ai/providers/compatible";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import { NvidiaProvider } from "@/lib/ai/providers/nvidia";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter";
import type { AIProvider, AIProviderConfig } from "@/lib/ai/types";

export function getAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "openrouter":
      return new OpenRouterProvider();
    case "compatible":
      return new OpenAICompatibleProvider();
    case "nvidia":
      return new NvidiaProvider();
    case "gemini":
      return new GeminiProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
      return new OpenAIProvider();
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
