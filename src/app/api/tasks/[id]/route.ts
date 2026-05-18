import { z } from "zod";
import {
  ensureQueuedAnalysisTaskScheduled,
  isAnalysisTaskTimedOut,
  recoverTimedOutAnalysisTask,
  scheduleQueuedAnalysisTask
} from "@/lib/analysis-task";
import type { AIProviderId } from "@/lib/ai/types";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { normalizeOptional, resolveProviderConfig } from "@/lib/env";
import {
  buildProviderConfigSnapshot,
  decryptProviderConfigSnapshot,
  encryptProviderConfigSnapshot
} from "@/lib/provider-config-crypto";
import { buildAnalyzeProviderConfigInput } from "@/lib/provider-profiles";
import {
  aiProviderSchema,
  aiProtocolSchema,
  apiKeyModeSchema,
  jobDescriptionSchema,
  providerConfigSchema,
  resumeTextSchema
} from "@/lib/request-schemas";
import { parseStreamedAnalysis, stringifyStreamedAnalysis } from "@/lib/streamed-analysis";
import { createEmptyPartialAnalysis } from "@/types/analysis";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const taskEditSchema = z.object({
  resumeText: resumeTextSchema,
  jobDescription: jobDescriptionSchema,
  provider: aiProviderSchema,
  protocol: aiProtocolSchema.optional(),
  apiKeyMode: apiKeyModeSchema.optional(),
  apiKey: providerConfigSchema.shape.apiKey,
  model: providerConfigSchema.shape.model,
  baseURL: providerConfigSchema.shape.baseURL,
  siteUrl: providerConfigSchema.shape.siteUrl,
  appName: providerConfigSchema.shape.appName
});

function pickTaskEditValue<T extends string>(value?: T) {
  return value === undefined ? undefined : (normalizeOptional(value) as T | undefined);
}

async function buildTaskProviderConfigInput(options: {
  userId: string;
  task: {
    provider: string;
    model: string;
    providerConfigEncrypted: string | null;
  };
  body: z.infer<typeof taskEditSchema>;
}) {
  const provider = options.body.provider as AIProviderId;
  const existingSnapshot = decryptProviderConfigSnapshot(options.task.providerConfigEncrypted);
  const savedDefaults = await buildAnalyzeProviderConfigInput(options.userId, { provider });
  const isSameProvider = provider === options.task.provider;

  return {
    provider,
    protocol:
      pickTaskEditValue(options.body.protocol) ??
      (isSameProvider ? existingSnapshot?.protocol : undefined) ??
      savedDefaults.protocol,
    apiKeyMode:
      pickTaskEditValue(options.body.apiKeyMode) ??
      (isSameProvider ? existingSnapshot?.apiKeyMode : undefined) ??
      savedDefaults.apiKeyMode,
    model:
      pickTaskEditValue(options.body.model) ??
      (isSameProvider ? options.task.model : undefined) ??
      savedDefaults.model,
    apiKey:
      pickTaskEditValue(options.body.apiKey) ??
      (isSameProvider ? existingSnapshot?.apiKey : undefined) ??
      savedDefaults.apiKey,
    baseURL:
      pickTaskEditValue(options.body.baseURL) ??
      (isSameProvider ? existingSnapshot?.baseURL : undefined) ??
      savedDefaults.baseURL,
    siteUrl:
      pickTaskEditValue(options.body.siteUrl) ??
      (isSameProvider ? existingSnapshot?.siteUrl : undefined) ??
      savedDefaults.siteUrl,
    appName:
      pickTaskEditValue(options.body.appName) ??
      (isSameProvider ? existingSnapshot?.appName : undefined) ??
      savedDefaults.appName
  };
}

const taskSelect = {
  id: true,
  status: true,
  progressStage: true,
  progressMessage: true,
  streamedAnalysis: true,
  errorMessage: true,
  resultId: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true
} as const;

function serializeTask(task: {
  id: string;
  status: string;
  progressStage: string | null;
  progressMessage: string | null;
  streamedAnalysis: string;
  resultId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}) {
  return {
    ...task,
    streamedAnalysis: parseStreamedAnalysis(task.streamedAnalysis),
    createdAt: task.createdAt.toISOString(),
    startedAt: task.startedAt?.toISOString() ?? null,
    finishedAt: task.finishedAt?.toISOString() ?? null
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  let task = await prisma.analysisTask.findFirst({
    where: { id, userId: user.id },
    select: taskSelect
  });

  if (!task) {
    return apiError("任务不存在。", 404, "TASK_NOT_FOUND");
  }

  if (task.status === "queued") {
    await ensureQueuedAnalysisTaskScheduled(task.id);
    task = await prisma.analysisTask.findFirst({
      where: { id, userId: user.id },
      select: taskSelect
    });
  }

  if (task && isAnalysisTaskTimedOut(task)) {
    await recoverTimedOutAnalysisTask(task.id);
    task = await prisma.analysisTask.findFirst({
      where: { id, userId: user.id },
      select: taskSelect
    });
  }

  if (!task) {
    return apiError("任务不存在。", 404, "TASK_NOT_FOUND");
  }

  return apiSuccess(serializeTask(task));
}

export async function POST(request: Request, context: RouteContext) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const task = await prisma.analysisTask.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      fileName: true,
      resumeText: true,
      jobDescription: true,
      provider: true,
      model: true,
      providerConfigEncrypted: true,
      resumeDocumentId: true
    }
  });

  if (!task) {
    return apiError("任务不存在。", 404, "TASK_NOT_FOUND");
  }

  if (task.status !== "failed") {
    return apiError("只有失败任务才能重试。", 400, "TASK_RETRY_NOT_ALLOWED");
  }

  const retriedTask = await prisma.analysisTask.create({
    data: {
      userId: user.id,
      resumeDocumentId: task.resumeDocumentId,
      fileName: task.fileName,
      resumeText: task.resumeText,
      jobDescription: task.jobDescription,
      provider: task.provider,
      model: task.model,
      providerConfigEncrypted: task.providerConfigEncrypted,
      streamedAnalysis: stringifyStreamedAnalysis(createEmptyPartialAnalysis()),
      progressStage: "queued",
      progressMessage: "任务已重新排队，等待 Worker 处理。",
      status: "queued"
    }
  });

  const retriedScheduled = await scheduleQueuedAnalysisTask(retriedTask.id);
  if (!retriedScheduled.scheduled) {
    return apiError("任务队列不可用，请稍后重试。", 503, "TASK_QUEUE_UNAVAILABLE");
  }

  return apiSuccess({
    taskId: retriedTask.id,
    status: retriedTask.status
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const task = await prisma.analysisTask.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      provider: true,
      model: true,
      providerConfigEncrypted: true
    }
  });

  if (!task) {
    return apiError("任务不存在。", 404, "TASK_NOT_FOUND");
  }

  if (task.status === "queued" || task.status === "processing") {
    return apiError("运行中的任务不能编辑，请等待完成后再修改。", 400, "TASK_EDIT_NOT_ALLOWED");
  }

  try {
    const body = taskEditSchema.parse(await request.json());
    const providerConfigInput = await buildTaskProviderConfigInput({ userId: user.id, task, body });
    const providerConfig = resolveProviderConfig(providerConfigInput);
    const providerConfigEncrypted = encryptProviderConfigSnapshot(buildProviderConfigSnapshot(providerConfigInput));

    const updatedTask = await prisma.analysisTask.update({
      where: { id: task.id },
      data: {
        resumeText: body.resumeText.trim(),
        jobDescription: body.jobDescription.trim(),
        provider: providerConfig.provider,
        model: providerConfig.model,
        providerConfigEncrypted,
        streamedAnalysis: stringifyStreamedAnalysis(createEmptyPartialAnalysis()),
        status: "queued",
        progressStage: "queued",
        progressMessage: "任务已更新，等待重新分析。",
        attemptCount: 0,
        processingToken: null,
        errorMessage: null,
        resultId: null,
        startedAt: null,
        finishedAt: null
      },
      select: {
        id: true,
        status: true
      }
    });

    const updatedScheduled = await scheduleQueuedAnalysisTask(updatedTask.id);
    if (!updatedScheduled.scheduled) {
      return apiError("任务队列不可用，请稍后重试。", 503, "TASK_QUEUE_UNAVAILABLE");
    }

    return apiSuccess({
      taskId: updatedTask.id,
      status: updatedTask.status
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "任务编辑参数不合法。", 400, "TASK_EDIT_INVALID");
    }

    const message = error instanceof Error ? error.message : "保存任务修改失败。";
    return apiError(message, 500, "TASK_EDIT_FAILED");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const task = await prisma.analysisTask.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true
    }
  });

  if (!task) {
    return apiError("任务不存在。", 404, "TASK_NOT_FOUND");
  }

  await prisma.analysisTask.delete({ where: { id: task.id } });

  return apiSuccess({
    taskId: task.id,
    deleted: true,
    status: task.status
  });
}
