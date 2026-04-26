import { z } from "zod";

export const rewrittenProjectSchema = z.object({
  title: z.string(),
  before: z.string(),
  after: z.string()
});

export const interviewQuestionSchema = z.object({
  question: z.string(),
  answer: z.string()
});

export const analysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  suggestions: z.array(z.string()),
  rewrittenSummary: z.string(),
  rewrittenProjects: z.array(rewrittenProjectSchema),
  interviewQuestions: z.array(interviewQuestionSchema)
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

export const partialAnalysisSchema = analysisSchema.partial();

export type PartialAnalysisResult = z.infer<typeof partialAnalysisSchema>;

export function createEmptyPartialAnalysis(): PartialAnalysisResult {
  return {
    matchedKeywords: [],
    missingKeywords: [],
    suggestions: [],
    rewrittenSummary: "",
    rewrittenProjects: [],
    interviewQuestions: []
  };
}

export const interviewPrepQuestionSchema = z.object({
  question: z.string(),
  category: z.enum(["technical", "project", "behavioral", "hr", "system_design", "open_ended"]),
  difficulty: z.enum(["basic", "intermediate", "advanced"]),
  sampleAnswer: z.string(),
  keyPoints: z.array(z.string())
});

export const interviewPrepResultSchema = z.object({
  questions: z.array(interviewPrepQuestionSchema)
});

export type InterviewPrepQuestion = z.infer<typeof interviewPrepQuestionSchema>;
export type InterviewPrepResult = z.infer<typeof interviewPrepResultSchema>;

export const categoryLabels: Record<InterviewPrepQuestion["category"], string> = {
  technical: "🔧 技术基础",
  project: "💼 项目经验",
  behavioral: "🧠 行为面试",
  hr: "🤝 HR 面试",
  system_design: "🏗️ 系统设计",
  open_ended: "💡 开放性问题"
};

export const difficultyLabels: Record<InterviewPrepQuestion["difficulty"], string> = {
  basic: "基础",
  intermediate: "进阶",
  advanced: "高级"
};
