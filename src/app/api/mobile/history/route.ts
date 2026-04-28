import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeSort(sort?: string): "latest" | "score" | "starred" {
  if (sort === "score") return "score";
  if (sort === "starred") return "starred";
  return "latest";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = normalizeSort(searchParams.get("sort") ?? undefined);

  const where: Prisma.ResumeAnalysisWhereInput = {
    userId: user.id,
    ...(search
      ? {
          OR: [
            { fileName: { contains: search } },
            { jobDescription: { contains: search } }
          ]
        }
      : {})
  };

  const orderBy: Prisma.ResumeAnalysisOrderByWithRelationInput[] =
    sort === "score"
      ? [{ score: "desc" }, { createdAt: "desc" }]
      : sort === "starred"
        ? [{ starred: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const items = await prisma.resumeAnalysis.findMany({
    where,
    orderBy,
    take: 50,
    select: {
      id: true,
      createdAt: true,
      fileName: true,
      score: true,
      jobDescription: true,
      starred: true
    }
  });

  return apiSuccess(
    items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    }))
  );
}
