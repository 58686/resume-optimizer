import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { extractTextFromFile } from "@/lib/parser";
import { prisma } from "@/lib/prisma";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";
import { deleteStoredFile, saveResumeFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const rateLimit = await checkRateLimit({
    key: `upload:${user.id}`,
    limit: 5,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("上传过于频繁，请一分钟后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return applyRateLimitHeaders(
        apiError("缺少上传文件。", 400, "FILE_REQUIRED"),
        rateLimit
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Extract text before writing to storage — parse failures won't leave orphaned files.
    const resumeText = await extractTextFromFile(file);

    const stored = await saveResumeFile({
      userId: user.id,
      fileName: file.name,
      buffer,
      mimeType: file.type
    });

    let document;
    try {
      document = await prisma.resumeDocument.create({
        data: {
          userId: user.id,
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          storageKey: stored.storageKey,
          extractedText: resumeText
        }
      });
    } catch (dbError) {
      // DB write failed after file was stored — clean up to avoid orphaned files.
      await deleteStoredFile(stored.storageKey).catch(() => undefined);
      throw dbError;
    }

    return applyRateLimitHeaders(
      apiSuccess({
        uploadId: document.id,
        fileName: file.name,
        resumeText
      }),
      rateLimit
    );
  } catch (error) {
    return applyRateLimitHeaders(
      apiError(getErrorMessage(error, "上传失败。"), 400, "UPLOAD_FAILED"),
      rateLimit
    );
  }
}
