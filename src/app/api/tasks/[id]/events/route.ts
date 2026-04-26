import { ensureQueuedAnalysisTaskScheduled } from "@/lib/analysis-task";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { parseStreamedAnalysis } from "@/lib/streamed-analysis";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const signal = request.signal;

      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      signal.addEventListener("abort", close);
      controller.enqueue(encoder.encode(": connected\n\n"));

      let lastPayload = "";

      while (!closed && !signal.aborted) {
        const task = await prisma.analysisTask.findFirst({
          where: {
            id,
            userId: user.id
          },
          select: {
            id: true,
            status: true,
            progressStage: true,
            progressMessage: true,
            streamedAnalysis: true,
            resultId: true,
            errorMessage: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true
          }
        });

        if (!task) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ code: "TASK_NOT_FOUND" })}\n\n`));
          close();
          return;
        }

        if (task.status === "queued") {
          await ensureQueuedAnalysisTaskScheduled(task.id);
        }

        const payload = JSON.stringify({
          id: task.id,
          status: task.status,
          progressStage: task.progressStage,
          progressMessage: task.progressMessage,
          streamedAnalysis: parseStreamedAnalysis(task.streamedAnalysis),
          resultId: task.resultId,
          errorMessage: task.errorMessage,
          createdAt: task.createdAt.toISOString(),
          startedAt: task.startedAt?.toISOString() ?? null,
          finishedAt: task.finishedAt?.toISOString() ?? null
        });

        if (payload !== lastPayload) {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          lastPayload = payload;
        }

        if (task.status === "succeeded" || task.status === "failed") {
          close();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
