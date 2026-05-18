import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { resolveProviderConfig } from "@/lib/env";
import { serializeInterviewPrepQuestions } from "@/lib/interview-prep-record";
import { getUserProviderConfigInput } from "@/lib/provider-configs";
import { buildAnalyzeProviderConfigInput } from "@/lib/provider-profiles";
import { prisma } from "@/lib/prisma";
import { applyRateLimitHeaders, checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import { jobDescriptionSchema, providerConfigSchema, resumeTextSchema } from "@/lib/request-schemas";
import { generateStructuredWithOpenAICompatible } from "@/lib/ai/shared";
import {
  buildCategoryInterviewPrompt,
  getCategoryMaxTokens,
  INTERVIEW_CATEGORIES
} from "@/lib/interview-prep-prompt";
import type { InterviewPrepQuestion } from "@/types/analysis";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    resumeText: resumeTextSchema,
    jobDescription: jobDescriptionSchema,
    analysisId: z.string().trim().min(1).optional(),
    sessionId: z.string().trim().min(1).optional(),
    providerConfigId: z.string().trim().min(1).optional(),
    providerConfig: providerConfigSchema.optional()
  })
  .refine((value) => value.providerConfigId || value.providerConfig, {
    message: "请选择一个 AI 配置，或传入 providerConfig。",
    path: ["providerConfigId"]
  });

const categoryQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(["technical", "project", "behavioral", "hr", "system_design", "open_ended"]),
      difficulty: z.enum(["basic", "intermediate", "advanced"]),
      sampleAnswer: z.string(),
      keyPoints: z.array(z.string())
    })
  )
});

function buildOpenAICompatibleConfig(providerConfig: ReturnType<typeof resolveProviderConfig>) {
  const base: Record<string, unknown> = {
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    protocol: providerConfig.protocol,
    apiKeyMode: providerConfig.apiKeyMode,
    providerLabel: providerConfig.provider
  };
  if (providerConfig.baseURL) base.baseURL = providerConfig.baseURL;
  if (providerConfig.proxy) base.proxy = providerConfig.proxy;
  if ("siteUrl" in providerConfig && providerConfig.siteUrl) {
    base.defaultHeaders = {
      ...(base.defaultHeaders as Record<string, string> | undefined),
      Referer: providerConfig.siteUrl
    };
  }
  if ("appName" in providerConfig && providerConfig.appName) {
    base.defaultHeaders = {
      ...(base.defaultHeaders as Record<string, string> | undefined),
      "X-Title": providerConfig.appName as string
    };
  }
  return base as {
    apiKey: string;
    model: string;
    protocol: "responses" | "chat_completions";
    apiKeyMode: "bearer" | "api_key_header" | "x_api_key_header";
    providerLabel: string;
    baseURL?: string;
    proxy?: string;
    defaultHeaders?: Record<string, string>;
    maxTokens?: number;
  };
}

async function persistInterviewPrepSession(params: {
  userId: string;
  analysisId?: string;
  sessionId?: string;
  sourceFileName?: string | null;
  resumeText: string;
  jobDescription: string;
  questions: InterviewPrepQuestion[];
}) {
  const data = {
    userId: params.userId,
    analysisId: params.analysisId ?? null,
    sourceFileName: params.sourceFileName ?? null,
    resumeText: params.resumeText,
    jobDescription: params.jobDescription,
    questions: serializeInterviewPrepQuestions(params.questions)
  };

  if (params.sessionId) {
    const existing = await prisma.interviewPrepSession.findFirst({
      where: {
        id: params.sessionId,
        userId: params.userId
      },
      select: { id: true }
    });

    if (existing) {
      return prisma.interviewPrepSession.update({
        where: { id: existing.id },
        data
      });
    }
  }

  if (params.analysisId) {
    return prisma.interviewPrepSession.upsert({
      where: { analysisId: params.analysisId },
      update: data,
      create: data
    });
  }

  return prisma.interviewPrepSession.create({
    data
  });
}

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return apiError("请先登录。", 401, "UNAUTHORIZED");

  const rateLimit = await checkRateLimit({
    key: `interview-prep:${user.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("请求过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "请求参数不合法。"), rateLimit);
    }
    return applyRateLimitHeaders(apiError("请求解析失败。", 400, "BAD_REQUEST"), rateLimit);
  }

  const providerConfigInput = body.providerConfigId
    ? await getUserProviderConfigInput(user.id, body.providerConfigId)
    : await buildAnalyzeProviderConfigInput(user.id, body.providerConfig!);

  if (!providerConfigInput) {
    return applyRateLimitHeaders(
      apiError("所选 AI 配置不存在。", 404, "PROVIDER_CONFIG_NOT_FOUND"),
      rateLimit
    );
  }

  const providerConfig = resolveProviderConfig(providerConfigInput);
  const baseConfig = buildOpenAICompatibleConfig(providerConfig);
  const { resumeText, jobDescription } = body;
  const signal = request.signal;
  const sourceAnalysis = body.analysisId
    ? await prisma.resumeAnalysis.findFirst({
        where: {
          id: body.analysisId,
          userId: user.id
        },
        select: {
          id: true,
          fileName: true
        }
      })
    : null;

  if (body.analysisId && !sourceAnalysis) {
    return applyRateLimitHeaders(
      apiError("来源分析记录不存在。", 404, "SOURCE_ANALYSIS_NOT_FOUND"),
      rateLimit
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const allQuestions: InterviewPrepQuestion[] = [];
        let savedSessionId: string | null = null;

        for (const category of INTERVIEW_CATEGORIES) {
          if (signal.aborted) break;

          send("progress", { category });

          const prompt = buildCategoryInterviewPrompt(category, resumeText, jobDescription);
          const config = { ...baseConfig, maxTokens: getCategoryMaxTokens(category) };

          try {
            const result = await generateStructuredWithOpenAICompatible(
              "You are a precise interview question generator. Output only structured JSON data.",
              prompt,
              categoryQuestionsSchema,
              `interview_${category}`,
              config
            );

            const questions = result.questions.filter((q) => q.category === category);
            allQuestions.push(...questions);
            send("questions", { category, questions });
          } catch (categoryError) {
            console.error(`[interview-prep] category ${category} failed:`, categoryError);

            const message =
              categoryError instanceof Error ? categoryError.message : String(categoryError);
            const isStructuredOutputError =
              message.includes("json_schema") ||
              message.includes("response_format") ||
              message.includes("output_parsed") ||
              message.includes("parsed");

            const userMessage = isStructuredOutputError
              ? "当前 AI 配置不支持结构化输出，请在 AI 配置页面将协议切换为「Chat Completions」或换用 OpenAI / OpenRouter 供应商。"
              : message || `生成 ${category} 类面试题失败`;

            send("error", { category, message: userMessage, fatal: false });
          }
        }

        if (!signal.aborted && allQuestions.length > 0) {
          try {
            const savedSession = await persistInterviewPrepSession({
              userId: user.id,
              analysisId: sourceAnalysis?.id,
              sessionId: body.sessionId,
              sourceFileName: sourceAnalysis?.fileName,
              resumeText,
              jobDescription,
              questions: allQuestions
            });

            savedSessionId = savedSession.id;
            send("saved", {
              sessionId: savedSession.id,
              savedAt: savedSession.updatedAt.toISOString()
            });
          } catch (persistError) {
            console.error("[interview-prep] persist failed:", persistError);
            send("error", {
              message: "面试题已生成，但保存失败，请稍后重试。",
              fatal: false,
              code: "SAVE_FAILED"
            });
          }
        }

        send("done", { totalQuestions: allQuestions.length, sessionId: savedSessionId });
      } catch (error) {
        console.error("[interview-prep] stream failed:", error);
        const message = error instanceof Error ? error.message : String(error);
        send("error", { message: message || "生成面试题失败，请稍后再试。", fatal: true });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...createRateLimitHeaders(rateLimit)
    }
  });
}
