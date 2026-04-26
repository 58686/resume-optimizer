import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { resolveProviderConfig } from "@/lib/env";
import { getUserProviderConfigInput } from "@/lib/provider-configs";
import { buildAnalyzeProviderConfigInput } from "@/lib/provider-profiles";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";
import { generateStructuredWithOpenAICompatible } from "@/lib/ai/shared";
import { buildKeywordExamplesPrompt } from "@/lib/prompts";
import { analysisInclude, mapAnalysisRecord } from "@/lib/analysis-record";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    providerConfigId: z.string().trim().min(1).optional(),
    providerConfig: z.object({ provider: z.string() }).passthrough().optional()
  })
  .refine((v) => v.providerConfigId || v.providerConfig, {
    message: "请选择一个 AI 配置。",
    path: ["providerConfigId"]
  });

const resultSchema = z.object({
  examples: z.array(z.object({ keyword: z.string(), example: z.string() }))
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = requireCsrfProtection(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return apiError("请先登录。", 401, "UNAUTHORIZED");

  const rateLimit = await checkRateLimit({
    key: `keyword-examples:${user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("请求过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    const { id } = await params;
    const body = bodySchema.parse(await request.json());

    const row = await prisma.resumeAnalysis.findFirst({
      where: { id, userId: user.id },
      include: analysisInclude
    });

    if (!row) return applyRateLimitHeaders(apiError("分析结果不存在。", 404, "NOT_FOUND"), rateLimit);

    const analysis = mapAnalysisRecord(row);
    const missingKeywords = analysis.missingKeywords;

    if (missingKeywords.length === 0) {
      return applyRateLimitHeaders(apiSuccess({ examples: [] }), rateLimit);
    }

    const providerConfigInput = body.providerConfigId
      ? await getUserProviderConfigInput(user.id, body.providerConfigId)
      : await buildAnalyzeProviderConfigInput(user.id, body.providerConfig as never);

    if (!providerConfigInput) {
      return applyRateLimitHeaders(apiError("所选 AI 配置不存在。", 404, "PROVIDER_CONFIG_NOT_FOUND"), rateLimit);
    }

    const providerConfig = resolveProviderConfig(providerConfigInput);

    const buildConfig = (pc: typeof providerConfig) => {
      const base: Record<string, unknown> = {
        apiKey: pc.apiKey,
        model: pc.model,
        protocol: pc.protocol,
        apiKeyMode: pc.apiKeyMode,
        providerLabel: pc.provider
      };
      if (pc.baseURL) base.baseURL = pc.baseURL;
      return base as Parameters<typeof generateStructuredWithOpenAICompatible>[4];
    };

    const prompt = buildKeywordExamplesPrompt(missingKeywords, row.resumeText, row.jobDescription);

    const result = await generateStructuredWithOpenAICompatible(
      "You are a professional resume writer. Output only structured data.",
      prompt,
      resultSchema,
      "keyword_examples",
      buildConfig(providerConfig)
    );

    return applyRateLimitHeaders(apiSuccess(result), rateLimit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "请求参数不合法。"), rateLimit);
    }
    return applyRateLimitHeaders(
      apiError(getErrorMessage(error, "生成改写示例失败。"), 500, "KEYWORD_EXAMPLES_FAILED"),
      rateLimit
    );
  }
}
