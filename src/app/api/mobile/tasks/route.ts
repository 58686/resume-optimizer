import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const items = await prisma.analysisTask.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      fileName: true,
      status: true,
      errorMessage: true,
      resultId: true,
      progressStage: true,
      progressMessage: true
    }
  });

  return apiSuccess(
    items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      startedAt: item.startedAt?.toISOString() ?? null,
      finishedAt: item.finishedAt?.toISOString() ?? null
    }))
  );
}
