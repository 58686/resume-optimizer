import type { AnalysisResult } from "@/types/analysis";
import { analysisInclude, mapAnalysisRecord } from "@/lib/analysis-record";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const row = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
    include: analysisInclude
  });

  if (!row) {
    return apiError("结果不存在。", 404, "RESULT_NOT_FOUND");
  }

  const analysis = mapAnalysisRecord(row);
  const payload: AnalysisResult & {
    id: string;
    createdAt: string;
    fileName: string | null;
    starred: boolean;
  } = {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    fileName: row.fileName,
    starred: row.starred,
    ...analysis
  };

  return apiSuccess(payload);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const existing = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("结果不存在。", 404, "RESULT_NOT_FOUND");
  }

  await prisma.resumeAnalysis.delete({ where: { id: existing.id } });
  return apiSuccess({ deleted: true });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const { id } = await context.params;
  const body = (await request.json()) as { starred?: boolean };

  if (typeof body.starred !== "boolean") {
    return apiError("缺少 starred 参数。", 400, "STARRED_REQUIRED");
  }

  const existing = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });

  if (!existing) {
    return apiError("结果不存在。", 404, "RESULT_NOT_FOUND");
  }

  const updated = await prisma.resumeAnalysis.update({
    where: { id: existing.id },
    data: { starred: body.starred },
    select: { id: true, starred: true }
  });

  return apiSuccess(updated);
}
