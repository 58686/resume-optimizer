import { getAnalysisQueue, enqueueAnalysisTask } from "../src/lib/analysis-queue";

const taskId = process.argv[2];
const queue = getAnalysisQueue();

async function main() {
  const before = await queue.getJobCounts();
  console.log("BEFORE", before);

  if (taskId) {
    await enqueueAnalysisTask(taskId);
    console.log("ENQUEUED", taskId);
  }

  const after = await queue.getJobCounts();
  console.log("AFTER", after);

  const jobs = await queue.getJobs(["waiting", "active", "delayed", "failed", "completed"], 0, 20, true);
  console.log(
    jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason
    }))
  );

  await queue.close();
}

main().catch(async (error) => {
  console.error(error);
  await queue.close();
  process.exit(1);
});
