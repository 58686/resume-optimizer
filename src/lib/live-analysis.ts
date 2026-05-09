import { z } from "zod";
import { analyzeResume } from "@/lib/openai";
import {
  buildInterviewPrompt,
  buildKeywordsPrompt,
  buildProjectsPrompt,
  buildSuggestionsPrompt,
  buildSummaryPrompt
} from "@/lib/prompts";
import { generateStructuredWithOpenAICompatible } from "@/lib/ai/shared";
import type { AIProviderConfig } from "@/lib/ai/types";
import type { AnalysisResult, PartialAnalysisResult } from "@/types/analysis";

const keywordsStageSchema = z.object({
  score: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string())
});

const suggestionsStageSchema = z.object({
  suggestions: z.array(z.string())
});

const summaryStageSchema = z.object({
  rewrittenSummary: z.string()
});

const projectsStageSchema = z.object({
  rewrittenProjects: z.array(
    z.object({
      title: z.string(),
      before: z.string(),
      after: z.string()
    })
  )
});

const interviewStageSchema = z.object({
  interviewQuestions: z.array(
    z.object({
      question: z.string(),
      answer: z.string()
    })
  )
});

type LiveAnalysisStep = {
  progressStage: string;
  progressMessage: string;
  patch: PartialAnalysisResult;
};

function getProviderLabel(config: AIProviderConfig) {
  switch (config.provider) {
    case "openrouter":
      return "OpenRouter";
    case "compatible":
      return "OpenAI-compatible provider";
    case "nvidia":
      return "NVIDIA";
    case "gemini":
      return "Gemini";
    case "anthropic":
      return "Anthropic";
    case "openai":
    default:
      return "OpenAI";
  }
}

function buildOpenAICompatibleConfig(providerConfig: AIProviderConfig) {
  switch (providerConfig.provider) {
    case "openrouter":
      return {
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL || "https://openrouter.ai/api/v1",
        model: providerConfig.model,
        protocol: providerConfig.protocol,
        apiKeyMode: providerConfig.apiKeyMode,
        providerLabel: "OpenRouter",
        defaultHeaders: {
          ...(providerConfig.siteUrl ? { Referer: providerConfig.siteUrl } : {}),
          ...(providerConfig.appName ? { "X-Title": providerConfig.appName } : {})
        }
      };
    case "compatible":
      return {
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL,
        model: providerConfig.model,
        protocol: providerConfig.protocol,
        apiKeyMode: providerConfig.apiKeyMode,
        providerLabel: "OpenAI-compatible provider"
      };
    case "nvidia":
      return {
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL || "https://integrate.api.nvidia.com/v1",
        model: providerConfig.model,
        protocol: providerConfig.protocol,
        apiKeyMode: providerConfig.apiKeyMode,
        providerLabel: "NVIDIA"
      };
    case "gemini":
      return {
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL || "https://generativelanguage.googleapis.com/v1beta/openai/",
        model: providerConfig.model,
        protocol: providerConfig.protocol,
        apiKeyMode: providerConfig.apiKeyMode,
        providerLabel: "Gemini"
      };
    case "openai":
    default:
      return {
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        protocol: providerConfig.protocol,
        apiKeyMode: providerConfig.apiKeyMode,
        providerLabel: "OpenAI"
      };
  }
}

async function generateStage<T>(
  providerConfig: AIProviderConfig,
  schema: z.ZodType<T>,
  schemaName: string,
  userPrompt: string
) {
  return generateStructuredWithOpenAICompatible(
    "You are a precise resume analysis engine. Output only structured data.",
    userPrompt,
    schema,
    schemaName,
    buildOpenAICompatibleConfig(providerConfig)
  );
}

export async function analyzeResumeWithLiveUpdates(
  resumeText: string,
  jobDescription: string,
  providerConfig: AIProviderConfig,
  onStep: (step: LiveAnalysisStep) => Promise<void>
): Promise<AnalysisResult> {
  if (providerConfig.provider === "anthropic") {
    const analysis = await analyzeResume(resumeText, jobDescription, providerConfig);
    await onStep({
      progressStage: "completed",
      progressMessage: `已通过 ${getProviderLabel(providerConfig)} 生成完整分析结果。`,
      patch: analysis
    });
    return analysis;
  }

  const keywords = await generateStage(
    providerConfig,
    keywordsStageSchema,
    "resume_keywords_stage",
    buildKeywordsPrompt(resumeText, jobDescription)
  );
  await onStep({
    progressStage: "keywords",
    progressMessage: "已提取关键词匹配和初始评分。",
    patch: keywords
  });

  const suggestions = await generateStage(
    providerConfig,
    suggestionsStageSchema,
    "resume_suggestions_stage",
    buildSuggestionsPrompt(resumeText, jobDescription, keywords.matchedKeywords, keywords.missingKeywords)
  );
  await onStep({
    progressStage: "suggestions",
    progressMessage: "已生成优化建议，正在继续改写内容。",
    patch: suggestions
  });

  const summary = await generateStage(
    providerConfig,
    summaryStageSchema,
    "resume_summary_stage",
    buildSummaryPrompt(resumeText, jobDescription)
  );
  await onStep({
    progressStage: "summary",
    progressMessage: "已生成个人总结改写。",
    patch: summary
  });

  const projects = await generateStage(
    providerConfig,
    projectsStageSchema,
    "resume_projects_stage",
    buildProjectsPrompt(resumeText, jobDescription)
  );
  await onStep({
    progressStage: "projects",
    progressMessage: "已生成项目改写建议。",
    patch: projects
  });

  const interview = await generateStage(
    providerConfig,
    interviewStageSchema,
    "resume_interview_stage",
    buildInterviewPrompt(resumeText, jobDescription, suggestions.suggestions)
  );
  await onStep({
    progressStage: "interview",
    progressMessage: "已生成面试问答，正在整理最终结果。",
    patch: interview
  });

  return {
    score: keywords.score,
    matchedKeywords: keywords.matchedKeywords,
    missingKeywords: keywords.missingKeywords,
    suggestions: suggestions.suggestions,
    rewrittenSummary: summary.rewrittenSummary,
    rewrittenProjects: projects.rewrittenProjects,
    interviewQuestions: interview.interviewQuestions
  };
}
