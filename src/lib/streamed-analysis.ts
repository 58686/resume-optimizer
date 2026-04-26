import {
  createEmptyPartialAnalysis,
  partialAnalysisSchema,
  type PartialAnalysisResult
} from "@/types/analysis";

export function parseStreamedAnalysis(value?: string | null): PartialAnalysisResult {
  if (!value) {
    return createEmptyPartialAnalysis();
  }

  try {
    return {
      ...createEmptyPartialAnalysis(),
      ...partialAnalysisSchema.parse(JSON.parse(value))
    };
  } catch {
    return createEmptyPartialAnalysis();
  }
}

export function stringifyStreamedAnalysis(value: PartialAnalysisResult) {
  return JSON.stringify({
    ...createEmptyPartialAnalysis(),
    ...value
  });
}

export function mergeStreamedAnalysis(
  current: PartialAnalysisResult,
  patch: PartialAnalysisResult
): PartialAnalysisResult {
  return {
    ...current,
    ...patch,
    matchedKeywords: patch.matchedKeywords ?? current.matchedKeywords ?? [],
    missingKeywords: patch.missingKeywords ?? current.missingKeywords ?? [],
    suggestions: patch.suggestions ?? current.suggestions ?? [],
    rewrittenSummary: patch.rewrittenSummary ?? current.rewrittenSummary ?? "",
    rewrittenProjects: patch.rewrittenProjects ?? current.rewrittenProjects ?? [],
    interviewQuestions: patch.interviewQuestions ?? current.interviewQuestions ?? []
  };
}
