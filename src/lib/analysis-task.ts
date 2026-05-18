import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { enqueueAnalysisTask, getAnalysisQueueJob } from "@/lib/analysis-queue";
import { analyzeResumeWithLiveUpdates } from "@/lib/live-analysis";
import { getProviderDisplayName, getUserFacingModelError } from "@/lib/model-error";
import { resolveTaskProviderConfig } from "@/lib/provider-config-crypto";
import {
  mergeStreamedAnalysis,
  parseStreamedAnalysis,
  stringifyStreamedAnalysis
} from "@/lib/streamed-analysis";
import {
  createEmptyPartialAnalysis,
  type AnalysisResult,
  type PartialAnalysisResult
} from "@/types/analysis";

type ClaimedTask = Awaited<ReturnType<typeof claimAnalysisTask>>;

function getTimeoutDeadline() {
  return new Date(Date.now() - env.ANALYSIS_TASK_TIMEOUT_MS);
}

function buildTimeoutRetryMessage(attemptCount: number) {
  return `上次执行超时，系统已自动重新排队（已尝试 ${attemptCount}/${env.ANALYSIS_TASK_MAX_ATTEMPTS} 次）。`;
}

function buildTimeoutFailedMessage(attemptCount: number) {
  return `任务处理超时，已达到最大重试次数（${attemptCount}/${env.ANALYSIS_TASK_MAX_ATTEMPTS}）。`;
}

async function claimAnalysisTask(taskId: string) {
  const processingToken = randomUUID();
  const startedAt = new Date();

  const claimed = await prisma.analysisTask.updateMany({
    where: {
      id: taskId,
      status: "queued"
    },
    data: {
      status: "processing",
      processingToken,
      startedAt,
      finishedAt: null,
      errorMessage: null,
      attemptCount: { increment: 1 }
    }
  });

  if (claimed.count === 0) {
    return null;
  }

  const task = await prisma.analysisTask.findUnique({
    where: { id: taskId }
  });

  if (!task || task.processingToken !== processingToken) {
    return null;
  }

  return { task, processingToken };
}

async function isCurrentAttempt(taskId: string, processingToken: string) {
  const current = await prisma.analysisTask.findFirst({
    where: {
      id: taskId,
      status: "processing",
      processingToken
    },
    select: { id: true }
  });

  return Boolean(current);
}

async function finalizeTaskFailure(taskId: string, processingToken: string, message: string) {
  await prisma.analysisTask.updateMany({
    where: {
      id: taskId,
      status: "processing",
      processingToken
    },
    data: {
      status: "failed",
      progressStage: "failed",
      progressMessage: message,
      errorMessage: message,
      finishedAt: new Date(),
      processingToken: null
    }
  });
}

async function persistAnalysisResult(task: NonNullable<ClaimedTask>["task"], analysis: AnalysisResult) {
  return prisma.resumeAnalysis.create({
    data: {
      userId: task.userId,
      resumeDocumentId: task.resumeDocumentId,
      fileName: task.fileName,
      resumeText: task.resumeText,
      jobDescription: task.jobDescription,
      score: analysis.score,
      matchedKeywords: JSON.stringify(analysis.matchedKeywords),
      missingKeywords: JSON.stringify(analysis.missingKeywords),
      suggestions: JSON.stringify(analysis.suggestions),
      rewrittenSummary: analysis.rewrittenSummary,
      rewrittenProjects: JSON.stringify(analysis.rewrittenProjects),
      interviewQuestions: JSON.stringify(analysis.interviewQuestions),
      keywords: {
        create: [
          ...analysis.matchedKeywords.map((value, position) => ({ kind: "matched", value, position })),
          ...analysis.missingKeywords.map((value, position) => ({ kind: "missing", value, position }))
        ]
      },
      suggestionItems: {
        create: analysis.suggestions.map((text, position) => ({ text, position }))
      },
      projectItems: {
        create: analysis.rewrittenProjects.map((project, position) => ({
          title: project.title,
          before: project.before,
          after: project.after,
          position
        }))
      },
      interviewItems: {
        create: analysis.interviewQuestions.map((item, position) => ({
          question: item.question,
          answer: item.answer,
          position
        }))
      }
    }
  });
}

async function writeStreamedAnalysisPatch(
  taskId: string,
  processingToken: string,
  patch: PartialAnalysisResult,
  progressStage?: string,
  progressMessage?: string
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.analysisTask.findFirst({
      where: {
        id: taskId,
        status: "processing",
        processingToken
      },
      select: {
        streamedAnalysis: true
      }
    });

    if (!current) {
      return false;
    }

    const merged = mergeStreamedAnalysis(parseStreamedAnalysis(current.streamedAnalysis), patch);

    await tx.analysisTask.updateMany({
      where: {
        id: taskId,
        status: "processing",
        processingToken
      },
      data: {
        streamedAnalysis: stringifyStreamedAnalysis(merged),
        ...(progressStage ? { progressStage } : {}),
        ...(progressMessage ? { progressMessage } : {})
      }
    });

    return true;
  });
}

async function finalizeTaskSuccess(claimedTask: NonNullable<ClaimedTask>) {
  const { task, processingToken } = claimedTask;
  await updateTaskProgress(task.id, processingToken, "preparing", "正在准备分析上下文。");

  const providerConfig = resolveTaskProviderConfig(task);
  const analysis = await analyzeResumeWithLiveUpdates(
    task.resumeText,
    task.jobDescription,
    providerConfig,
    async (step) => {
      if (!(await isCurrentAttempt(task.id, processingToken))) {
        return;
      }

      await writeStreamedAnalysisPatch(
        task.id,
        processingToken,
        step.patch,
        step.progressStage,
        step.progressMessage
      );
    }
  );

  if (!(await isCurrentAttempt(task.id, processingToken))) {
    return;
  }

  await updateTaskProgress(task.id, processingToken, "persisting", "正在保存分析结果。");
  const saved = await persistAnalysisResult(task, analysis);

  const updated = await prisma.analysisTask.updateMany({
    where: {
      id: task.id,
      status: "processing",
      processingToken
    },
    data: {
      status: "succeeded",
      progressStage: "completed",
      progressMessage: "分析完成，结果已生成。",
      streamedAnalysis: stringifyStreamedAnalysis(analysis),
      resultId: saved.id,
      finishedAt: new Date(),
      processingToken: null
    }
  });

  if (updated.count === 0) {
    await prisma.resumeAnalysis.delete({ where: { id: saved.id } }).catch(() => undefined);
  }
}

export function isAnalysisTaskTimedOut(task: { status: string; startedAt: Date | null }) {
  if (task.status !== "processing" || !task.startedAt) {
    return false;
  }

  return task.startedAt.getTime() < Date.now() - env.ANALYSIS_TASK_TIMEOUT_MS;
}

export async function updateTaskProgress(
  taskId: string,
  processingToken: string | null,
  progressStage: string,
  progressMessage: string
) {
  await prisma.analysisTask.updateMany({
    where: {
      id: taskId,
      ...(processingToken ? { processingToken } : {})
    },
    data: {
      progressStage,
      progressMessage
    }
  });
}

export async function recoverTimedOutAnalysisTask(taskId: string) {
  const task = await prisma.analysisTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      attemptCount: true,
      startedAt: true
    }
  });

  if (!task || !isAnalysisTaskTimedOut(task)) {
    return { recovered: false, action: "skipped" as const };
  }

  const timeoutDeadline = getTimeoutDeadline();

  if (task.attemptCount >= env.ANALYSIS_TASK_MAX_ATTEMPTS) {
    const failed = await prisma.analysisTask.updateMany({
      where: {
        id: task.id,
        status: "processing",
        startedAt: { lt: timeoutDeadline }
      },
      data: {
        status: "failed",
        progressStage: "failed",
        progressMessage: buildTimeoutFailedMessage(task.attemptCount),
        errorMessage: buildTimeoutFailedMessage(task.attemptCount),
        finishedAt: new Date(),
        processingToken: null
      }
    });

    return { recovered: failed.count > 0, action: "failed" as const };
  }

  const requeued = await prisma.analysisTask.updateMany({
    where: {
      id: task.id,
      status: "processing",
      startedAt: { lt: timeoutDeadline }
    },
    data: {
      status: "queued",
      progressStage: "queued",
      progressMessage: buildTimeoutRetryMessage(task.attemptCount),
      errorMessage: buildTimeoutRetryMessage(task.attemptCount),
      startedAt: null,
      finishedAt: null,
      processingToken: null
    }
  });

  if (requeued.count > 0) {
    await enqueueAnalysisTask(task.id);
  }

  return { recovered: requeued.count > 0, action: "requeued" as const };
}

export async function recoverTimedOutAnalysisTasks(limit = 20) {
  const timeoutDeadline = getTimeoutDeadline();
  const tasks = await prisma.analysisTask.findMany({
    where: {
      status: "processing",
      startedAt: { lt: timeoutDeadline }
    },
    orderBy: { startedAt: "asc" },
    take: limit,
    select: { id: true }
  });

  const results = await Promise.all(tasks.map((task) => recoverTimedOutAnalysisTask(task.id)));

  let requeued = 0;
  let failed = 0;

  for (const result of results) {
    if (!result.recovered) continue;
    if (result.action === "requeued") requeued += 1;
    if (result.action === "failed") failed += 1;
  }

  return {
    scanned: tasks.length,
    requeued,
    failed,
    timeoutMs: env.ANALYSIS_TASK_TIMEOUT_MS,
    maxAttempts: env.ANALYSIS_TASK_MAX_ATTEMPTS
  };
}

export async function requeuePendingAnalysisTasks(limit = 100) {
  const tasks = await prisma.analysisTask.findMany({
    where: {
      status: "queued"
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true }
  });

  for (const task of tasks) {
    await enqueueAnalysisTask(task.id);
  }

  return {
    queued: tasks.length
  };
}

export async function ensureQueuedAnalysisTaskScheduled(taskId: string) {
  const task = await prisma.analysisTask.findUnique({
    where: { id: taskId },
    select: { id: true, status: true }
  });

  if (!task || task.status !== "queued") {
    return { scheduled: false, reason: "not_queued" as const };
  }

  const existingJob = await getAnalysisQueueJob(taskId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "waiting" || state === "active" || state === "delayed" || state === "prioritized") {
      return { scheduled: false, reason: "already_scheduled" as const };
    }
  }

  await enqueueAnalysisTask(taskId);
  return { scheduled: true, reason: "enqueued" as const };
}

export async function scheduleQueuedAnalysisTask(taskId: string) {
  try {
    await enqueueAnalysisTask(taskId);
    return { scheduled: true };
  } catch (error) {
    console.error("[analysis-task] failed to enqueue task", { taskId, error });
    const message = "任务队列不可用，请稍后重试。";

    await prisma.analysisTask.updateMany({
      where: {
        id: taskId,
        status: "queued"
      },
      data: {
        status: "failed",
        progressStage: "failed",
        progressMessage: message,
        errorMessage: message,
        finishedAt: new Date(),
        processingToken: null
      }
    });

    return {
      scheduled: false,
      message
    };
  }
}

export async function runAnalysisTask(taskId: string) {
  const claimedTask = await claimAnalysisTask(taskId);

  if (!claimedTask) {
    return;
  }

  try {
    if (!claimedTask.task.streamedAnalysis || claimedTask.task.streamedAnalysis === "{}") {
      await prisma.analysisTask.updateMany({
        where: {
          id: claimedTask.task.id,
          processingToken: claimedTask.processingToken
        },
        data: {
          streamedAnalysis: stringifyStreamedAnalysis(createEmptyPartialAnalysis())
        }
      });
    }

    await finalizeTaskSuccess(claimedTask);
  } catch (error) {
    console.error("Analysis task failed:", {
      taskId: claimedTask.task.id,
      provider: claimedTask.task.provider,
      error
    });
    const message = getUserFacingModelError(error, getProviderDisplayName(claimedTask.task.provider));
    await finalizeTaskFailure(claimedTask.task.id, claimedTask.processingToken, message);
  }
}

export async function processAnalysisTask(taskId: string) {
  try {
    await enqueueAnalysisTask(taskId);

    // Give the worker a chance to pick up the job.
    // If it's still waiting after a short delay, the worker likely isn't running.
    const picked = await waitForJobPickup(taskId, 5000);

    if (picked) {
      return; // Worker is handling it
    }

    // Worker didn't pick it up — run directly in this process.
    console.log(`[processAnalysisTask] Worker did not pick up task ${taskId} in time, running directly.`);
    await runAnalysisTask(taskId);
  } catch (error) {
    // BullMQ / Redis is unavailable — run directly as fallback.
    console.warn(`[processAnalysisTask] Queue unavailable for task ${taskId}, running directly.`, error);
    await runAnalysisTask(taskId);
  }
}

async function waitForJobPickup(taskId: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  const interval = 250;

  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    const task = await prisma.analysisTask.findUnique({
      where: { id: taskId },
      select: { status: true }
    });

    // Worker claimed it (processing) or already finished
    if (task && task.status !== "queued") {
      return true;
    }
  }

  return false;
}
