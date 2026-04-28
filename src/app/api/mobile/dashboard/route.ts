import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const [analysisCount, activeTaskCount, failedTaskCount, averageScore, recentResults, recentTasks] =
    await Promise.all([
      prisma.resumeAnalysis.count({ where: { userId: user.id } }),
      prisma.analysisTask.count({
        where: { userId: user.id, status: { in: ["queued", "processing"] } }
      }),
      prisma.analysisTask.count({ where: { userId: user.id, status: "failed" } }),
      prisma.resumeAnalysis.aggregate({ where: { userId: user.id }, _avg: { score: true } }),
      prisma.resumeAnalysis.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          fileName: true,
          score: true,
          createdAt: true,
          starred: true
        }
      }),
      prisma.analysisTask.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          fileName: true,
          status: true,
          resultId: true,
          createdAt: true
        }
      })
    ]);

  return apiSuccess({
    stats: {
      analysisCount,
      activeTaskCount,
      failedTaskCount,
      averageScore:
        typeof averageScore._avg.score === "number" ? Math.round(averageScore._avg.score) : null
    },
    recentResults: recentResults.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    })),
    recentTasks: recentTasks.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    }))
  });
}
