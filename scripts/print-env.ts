import { env } from "../src/lib/env";
console.log(JSON.stringify({
  REDIS_URL: env.REDIS_URL,
  ANALYSIS_QUEUE_NAME: env.ANALYSIS_QUEUE_NAME,
  ANALYSIS_TASK_WORKER_CONCURRENCY: env.ANALYSIS_TASK_WORKER_CONCURRENCY
}, null, 2));
process.exit(0);
