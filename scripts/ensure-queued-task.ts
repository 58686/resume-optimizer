import { ensureQueuedAnalysisTaskScheduled } from "../src/lib/analysis-task";

async function main() {
  const taskId = process.argv[2];
  if (!taskId) throw new Error("taskId required");
  const result = await ensureQueuedAnalysisTaskScheduled(taskId);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
