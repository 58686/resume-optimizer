import { createAnalysisWorker } from "../lib/analysis-queue";
import {
  recoverTimedOutAnalysisTasks,
  requeuePendingAnalysisTasks,
  runAnalysisTask
} from "../lib/analysis-task";

const RECOVERY_INTERVAL_MS = 60 * 1000;

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

  // Periodically recover timed-out tasks (replaces the per-request recovery that was removed
  // from the analyze API route to keep the request path lean).
  const recoveryTimer = setInterval(() => {
    void recoverTimedOutAnalysisTasks().catch((error) => {
      console.error("[analysis-worker] periodic recovery failed", error);
    });
  }, RECOVERY_INTERVAL_MS);

  const shutdown = async (signal: string) => {
    console.log(`[analysis-worker] shutting down on ${signal}`);
    clearInterval(recoveryTimer);
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
