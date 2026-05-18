import { z } from "zod";
import { scheduleQueuedAnalysisTask } from "@/lib/analysis-task";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { resolveProviderConfig } from "@/lib/env";
import {
  buildProviderConfigSnapshot,
  encryptProviderConfigSnapshot
} from "@/lib/provider-config-crypto";
import { getUserProviderConfigInput } from "@/lib/provider-configs";
import { buildAnalyzeProviderConfigInput } from "@/lib/provider-profiles";
import { prisma } from "@/lib/prisma";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";
import { jobDescriptionSchema, providerConfigSchema, resumeTextSchema } from "@/lib/request-schemas";
import { stringifyStreamedAnalysis } from "@/lib/streamed-analysis";
import { createEmptyPartialAnalysis } from "@/types/analysis";

export const runtime = "nodejs";

const analyzeBodySchema = z
  .object({
    resumeDocumentId: z.string().trim().min(1).optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    resumeText: resumeTextSchema,
    jobDescription: jobDescriptionSchema,
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
    key: `analyze:${user.id}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("分析请求过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    const body = analyzeBodySchema.parse(await request.json());
    const providerConfigInput = body.providerConfigId
      ? await getUserProviderConfigInput(user.id, body.providerConfigId)
      : await buildAnalyzeProviderConfigInput(user.id, body.providerConfig!);

    if (!providerConfigInput) {
      return applyRateLimitHeaders(
        apiError("所选 AI 配置不存在。", 404, "PROVIDER_CONFIG_NOT_FOUND"),
        rateLimit
      );
    }

    const providerConfigSnapshot = buildProviderConfigSnapshot(providerConfigInput);
    const providerConfigEncrypted = encryptProviderConfigSnapshot(providerConfigSnapshot);
    const providerConfig = resolveProviderConfig(providerConfigInput);

    let resumeDocumentId: string | undefined;

    if (body.resumeDocumentId) {
      const document = await prisma.resumeDocument.findFirst({
        where: { id: body.resumeDocumentId, userId: user.id },
        select: { id: true }
      });

      if (!document) {
        return applyRateLimitHeaders(
          apiError("上传文件记录不存在。", 404, "DOCUMENT_NOT_FOUND"),
          rateLimit
        );
      }

      resumeDocumentId = document.id;
    }

    const task = await prisma.analysisTask.create({
      data: {
        userId: user.id,
        resumeDocumentId,
        fileName: body.fileName,
        resumeText: body.resumeText.trim(),
        jobDescription: body.jobDescription.trim(),
        provider: providerConfig.provider,
        model: providerConfig.model,
        providerConfigEncrypted,
        streamedAnalysis: stringifyStreamedAnalysis(createEmptyPartialAnalysis()),
        progressStage: "queued",
        progressMessage: "任务已创建，等待进入分析队列。",
        status: "queued"
      }
    });

    const scheduled = await scheduleQueuedAnalysisTask(task.id);
    if (!scheduled.scheduled) {
      return applyRateLimitHeaders(
        apiError("任务队列不可用，请稍后重试。", 503, "ANALYSIS_QUEUE_UNAVAILABLE"),
        rateLimit
      );
    }

    return applyRateLimitHeaders(
      apiSuccess({
        taskId: task.id,
        status: task.status
      }),
      rateLimit
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "请求参数不合法。"), rateLimit);
    }

    return applyRateLimitHeaders(
      apiError(getErrorMessage(error, "创建分析任务失败。"), 500, "ANALYZE_CREATE_FAILED"),
      rateLimit
    );
  }
}
