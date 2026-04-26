import { runAnalysisTask } from "../src/lib/analysis-task";

async function main() {
  const taskId = process.argv[2];
  if (!taskId) {
    throw new Error("taskId required");
  }

  await runAnalysisTask(taskId);
  console.log("done");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
