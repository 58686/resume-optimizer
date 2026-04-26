import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { processAnalysisTask } from "@/lib/analysis-task";

export const runtime = "nodejs";

const bodySchema = z.object({
  resumeText: z.string().trim().min(50).max(30000),
  jobDescription: z.string().trim().min(30).max(16000).optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = requireCsrfProtection(request);
  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();
  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const body = bodySchema.parse(await request.json());

  const result = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      fileName: true,
      resumeDocumentId: true,
      jobDescription: true,
      sourceTask: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          provider: true,
          model: true,
          providerConfigEncrypted: true
        }
      }
    }
  });

  if (!result) {
    return apiError("结果不存在。", 404, "RESULT_NOT_FOUND");
  }

  const sourceTask = result.sourceTask[0];
  if (!sourceTask) {
    return apiError("原始分析配置不存在，暂时无法重新分析。", 400, "SOURCE_TASK_NOT_FOUND");
  }

  const task = await prisma.analysisTask.create({
    data: {
      userId: user.id,
      resumeDocumentId: result.resumeDocumentId,
      fileName: result.fileName,
      resumeText: body.resumeText.trim(),
      jobDescription: body.jobDescription?.trim() || result.jobDescription,
      provider: sourceTask.provider,
      model: sourceTask.model,
      providerConfigEncrypted: sourceTask.providerConfigEncrypted,
      status: "queued",
      progressStage: "queued",
      progressMessage: "任务已创建，等待重新分析。"
    },
    select: {
      id: true,
      status: true
    }
  });

  try {
    await processAnalysisTask(task.id);
  } catch (error) {
    await prisma.analysisTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        progressStage: "failed",
        progressMessage: error instanceof Error ? error.message : "任务队列不可用，请稍后重试。",
        errorMessage: error instanceof Error ? error.message : "任务队列不可用，请稍后重试。",
        finishedAt: new Date()
      }
    });

    return apiError("任务队列不可用，请稍后重试。", 503, "TASK_QUEUE_UNAVAILABLE");
  }

  return apiSuccess({
    taskId: task.id,
    status: task.status
  });
}
