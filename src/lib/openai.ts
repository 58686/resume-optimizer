import { getAIProvider } from "@/lib/ai";
import type { AIProviderConfig } from "@/lib/ai/types";
import type { AnalysisResult } from "@/types/analysis";

export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  providerConfig: AIProviderConfig
): Promise<AnalysisResult> {
  const provider = getAIProvider(providerConfig);
  return provider.analyzeResume({ resumeText, jobDescription, providerConfig });
}
