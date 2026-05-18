import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { scheduleQueuedAnalysisTask } from "@/lib/analysis-task";
import { jobDescriptionSchema, resumeTextSchema } from "@/lib/request-schemas";

export const runtime = "nodejs";

const bodySchema = z.object({
  resumeText: resumeTextSchema,
  jobDescription: jobDescriptionSchema.optional()
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
  let body: z.infer<typeof bodySchema>;

  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "重新分析参数不合法。");
    }

    return apiError("重新分析参数不合法。", 400, "REANALYZE_INVALID");
  }

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

  const scheduled = await scheduleQueuedAnalysisTask(task.id);
  if (!scheduled.scheduled) {
    return apiError("任务队列不可用，请稍后重试。", 503, "TASK_QUEUE_UNAVAILABLE");
  }

  return apiSuccess({
    taskId: task.id,
    status: task.status
  });
}
