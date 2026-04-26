import type { Prisma } from "@prisma/client";
import { pickStructuredArray } from "@/lib/utils";
import type { AnalysisResult } from "@/types/analysis";

export const analysisInclude = {
  keywords: {
    orderBy: [{ kind: "asc" }, { position: "asc" }]
  },
  suggestionItems: {
    orderBy: { position: "asc" }
  },
  projectItems: {
    orderBy: { position: "asc" }
  },
  interviewItems: {
    orderBy: { position: "asc" }
  }
} satisfies Prisma.ResumeAnalysisInclude;

export type ResumeAnalysisWithRelations = Prisma.ResumeAnalysisGetPayload<{
  include: typeof analysisInclude;
}>;

export function mapAnalysisRecord(row: ResumeAnalysisWithRelations): AnalysisResult {
  const matchedKeywords = pickStructuredArray(
    row.keywords.filter((item) => item.kind === "matched").map((item) => item.value),
    row.matchedKeywords
  );
  const missingKeywords = pickStructuredArray(
    row.keywords.filter((item) => item.kind === "missing").map((item) => item.value),
    row.missingKeywords
  );
  const suggestions = pickStructuredArray(
    row.suggestionItems.map((item) => item.text),
    row.suggestions
  );
  const rewrittenProjects = pickStructuredArray(
    row.projectItems.map((item) => ({
      title: item.title,
      before: item.before,
      after: item.after
    })),
    row.rewrittenProjects
  );
  const interviewQuestions = pickStructuredArray(
    row.interviewItems.map((item) => ({
      question: item.question,
      answer: item.answer
    })),
    row.interviewQuestions
  );

  return {
    score: row.score ?? 0,
    matchedKeywords,
    missingKeywords,
    suggestions,
    rewrittenSummary: row.rewrittenSummary,
    rewrittenProjects,
    interviewQuestions
  };
}
