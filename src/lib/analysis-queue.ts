import { Queue, Worker, type JobsOptions, type WorkerOptions } from "bullmq";
import { env } from "@/lib/env";
import { createRedisConnection } from "@/lib/redis";

export const ANALYSIS_QUEUE_JOB_NAME = "analysis-task";

type AnalysisJobPayload = {
  taskId: string;
};

let queueInstance: Queue<AnalysisJobPayload> | null = null;

function getDefaultJobOptions(): JobsOptions {
  return {
    jobId: undefined,
    removeOnComplete: 100,
    removeOnFail: 200
  };
}

export function getAnalysisQueue() {
  if (!queueInstance) {
    queueInstance = new Queue<AnalysisJobPayload>(env.ANALYSIS_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: getDefaultJobOptions()
    });
  }

  return queueInstance;
}

export async function enqueueAnalysisTask(taskId: string) {
  const queue = getAnalysisQueue();
  const existingJob = await queue.getJob(taskId);

  if (existingJob) {
    const state = await existingJob.getState();

    // Requeued or edited tasks reuse the same task id. Remove terminal jobs so BullMQ
    // doesn't silently dedupe the new enqueue request by jobId.
    if (state === "completed" || state === "failed") {
      await existingJob.remove();
    }
  }

  await queue.add(
    ANALYSIS_QUEUE_JOB_NAME,
    { taskId },
    {
      ...getDefaultJobOptions(),
      jobId: taskId
    }
  );
}

export async function getAnalysisQueueJob(taskId: string) {
  const queue = getAnalysisQueue();
  return queue.getJob(taskId);
}

export function createAnalysisWorker(
  processor: (taskId: string) => Promise<void>,
  options?: Partial<WorkerOptions>
) {
  return new Worker<AnalysisJobPayload>(
    env.ANALYSIS_QUEUE_NAME,
    async (job) => {
      await processor(job.data.taskId);
    },
    {
      connection: createRedisConnection(),
      concurrency: env.ANALYSIS_TASK_WORKER_CONCURRENCY,
      lockDuration: env.ANALYSIS_TASK_TIMEOUT_MS + 30_000,
      stalledInterval: 30_000,
      maxStalledCount: 1,
      ...options
    }
  );
}
