import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { resolveProviderConfig } from "@/lib/env";
import { getUserProviderConfigInput } from "@/lib/provider-configs";
import { buildAnalyzeProviderConfigInput } from "@/lib/provider-profiles";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";
import { generateStructuredWithOpenAICompatible } from "@/lib/ai/shared";
import { buildInterviewPrepPrompt } from "@/lib/interview-prep-prompt";
import { interviewPrepResultSchema } from "@/types/analysis";

export const runtime = "nodejs";

const providerConfigSchema = z.object({
  provider: z.enum(["openai", "openrouter", "compatible", "nvidia", "gemini", "anthropic"]),
  protocol: z.enum(["responses", "chat_completions"]).optional(),
  apiKeyMode: z.enum(["bearer", "api_key_header", "x_api_key_header"]).optional(),
  apiKey: z.string().trim().max(500).optional(),
  model: z.string().trim().max(200).optional(),
  baseURL: z.string().trim().max(500).optional(),
  siteUrl: z.string().trim().max(500).optional(),
  appName: z.string().trim().max(100).optional()
});

const bodySchema = z
  .object({
    resumeText: z
      .string()
      .trim()
      .min(50, "简历内容至少需要 50 个字符。")
      .max(30000, "简历内容过长，请精简后再试。"),
    jobDescription: z
      .string()
      .trim()
      .min(30, "职位描述至少需要 30 个字符。")
      .max(16000, "职位描述过长，请仅保留核心职责和要求。"),
    providerConfigId: z.string().trim().min(1).optional(),
    providerConfig: providerConfigSchema.optional()
  })
  .refine((value) => value.providerConfigId || value.providerConfig, {
    message: "请选择一个 AI 配置，或传入 providerConfig。",
    path: ["providerConfigId"]
  });

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

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

  try {
    const body = bodySchema.parse(await request.json());
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

    const buildOpenAICompatibleConfig = (pc: typeof providerConfig) => {
      const base: Record<string, unknown> = {
        apiKey: pc.apiKey,
        model: pc.model,
        protocol: pc.protocol,
        apiKeyMode: pc.apiKeyMode,
        providerLabel: pc.provider
      };
      if (pc.baseURL) base.baseURL = pc.baseURL;
      if ("siteUrl" in pc && pc.siteUrl) {
        base.defaultHeaders = {
          ...(base.defaultHeaders as Record<string, string> | undefined),
          Referer: pc.siteUrl
        };
      }
      if ("appName" in pc && pc.appName) {
        base.defaultHeaders = {
          ...(base.defaultHeaders as Record<string, string> | undefined),
          "X-Title": pc.appName as string
        };
      }
      return base as {
        apiKey: string;
        model: string;
        protocol: "responses" | "chat_completions";
        apiKeyMode: "bearer" | "api_key_header" | "x_api_key_header";
        providerLabel: string;
        baseURL?: string;
        defaultHeaders?: Record<string, string>;
        maxTokens?: number;
      };
    };

    const prompt = buildInterviewPrepPrompt(body.resumeText, body.jobDescription);

    const config = buildOpenAICompatibleConfig(providerConfig);
    // 35-50 questions with Chinese answers needs ~8000+ output tokens
    config.maxTokens = 10000;

    const result = await generateStructuredWithOpenAICompatible(
      "You are a precise interview question generator. Output only structured data.",
      prompt,
      interviewPrepResultSchema,
      "interview_prep_questions",
      config
    );

    return applyRateLimitHeaders(apiSuccess(result), rateLimit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "请求参数不合法。"), rateLimit);
    }

    const message = error instanceof Error ? error.message : "";
    const isStructuredOutputError =
      message.includes("json_schema") ||
      message.includes("response_format") ||
      message.includes("output_parsed") ||
      message.includes("parsed");

    const userMessage = isStructuredOutputError
      ? "当前 AI 配置不支持结构化输出，请在 AI 配置页面将协议切换为「Chat Completions」或换用 OpenAI / OpenRouter 供应商。"
      : getErrorMessage(error, "生成面试题失败，请稍后再试。");

    return applyRateLimitHeaders(
      apiError(userMessage, 500, "INTERVIEW_PREP_FAILED"),
      rateLimit
    );
  }
}
