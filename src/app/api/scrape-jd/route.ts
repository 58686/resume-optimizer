import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().url("请输入有效的 URL。").max(2000)
});

function stripHtml(html: string): string {
  // Remove script/style blocks entirely
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  // Replace block-level tags with newlines
  text = text.replace(/<\/?(p|div|section|article|li|h[1-6]|br|tr|td|th)[^>]*>/gi, "\n");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–");

  // Collapse whitespace and blank lines
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
}

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);
  if (csrfError) return csrfError;

  const user = await getCurrentUser();
  if (!user) return apiError("请先登录。", 401, "UNAUTHORIZED");

  try {
    const body = bodySchema.parse(await request.json());

    let html: string;
    try {
      const response = await fetch(body.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ResumeOptimizer/1.0)",
          Accept: "text/html,application/xhtml+xml"
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return apiError(`无法访问该页面（HTTP ${response.status}），请手动粘贴职位描述。`, 422, "FETCH_FAILED");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return apiError("该 URL 返回的不是网页内容，请手动粘贴职位描述。", 422, "NOT_HTML");
      }

      html = await response.text();
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : "";
      if (msg.includes("timeout") || msg.includes("aborted")) {
        return apiError("页面加载超时（10 秒），请手动粘贴职位描述。", 422, "FETCH_TIMEOUT");
      }
      return apiError("无法访问该 URL，请检查链接或手动粘贴职位描述。", 422, "FETCH_ERROR");
    }

    const text = stripHtml(html);

    if (text.length < 50) {
      return apiError("未能从该页面提取到有效文本，该网站可能是动态渲染（SPA），请手动粘贴职位描述。", 422, "NO_CONTENT");
    }

    // Trim to reasonable JD length
    const trimmed = text.slice(0, 8000);

    return apiSuccess({ text: trimmed, length: trimmed.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "请求参数不合法。");
    }
    return apiError("抓取失败，请手动粘贴职位描述。", 500, "SCRAPE_FAILED");
  }
}
