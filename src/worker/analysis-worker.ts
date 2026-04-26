import { createAnalysisWorker } from "../lib/analysis-queue";
import {
  recoverTimedOutAnalysisTasks,
  requeuePendingAnalysisTasks,
  runAnalysisTask
} from "../lib/analysis-task";

async function main() {
  await recoverTimedOutAnalysisTasks();
  await requeuePendingAnalysisTasks();

  const worker = createAnalysisWorker(runAnalysisTask);

  worker.on("ready", () => {
    console.log("[analysis-worker] ready");
  });

  worker.on("completed", (job) => {
    console.log("[analysis-worker] completed", { taskId: job.data.taskId, jobId: job.id });
  });

  worker.on("failed", (job, error) => {
    console.error("[analysis-worker] failed", {
      taskId: job?.data.taskId,
      jobId: job?.id,
      error
    });
  });

  const shutdown = async (signal: string) => {
    console.log(`[analysis-worker] shutting down on ${signal}`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main().catch((error) => {
  console.error("[analysis-worker] boot failed", error);
  process.exit(1);
});
