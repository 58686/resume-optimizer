import { z } from "zod";
import type { AIProviderId } from "@/lib/ai/types";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { deleteUserProviderProfile, saveUserProviderProfile } from "@/lib/provider-profiles";

export const runtime = "nodejs";

const providerParamSchema = z.enum(["openai", "openrouter", "compatible", "nvidia", "gemini", "anthropic"]);

const providerProfileBodySchema = z.object({
  protocol: z.enum(["responses", "chat_completions"]).optional(),
  apiKeyMode: z.enum(["bearer", "api_key_header", "x_api_key_header"]).optional(),
  apiKey: z.string().trim().max(500, "API Key 过长。").optional(),
  model: z.string().trim().max(200, "模型名称过长。").optional(),
  baseURL: z.string().trim().max(500, "Base URL 过长。").optional(),
  siteUrl: z.string().trim().max(500, "站点 URL 过长。").optional(),
  appName: z.string().trim().max(100, "应用名称过长。").optional()
});

type RouteContext = {
  params: Promise<{ provider: string }>;
};

async function getValidatedProvider(context: RouteContext) {
  const { provider } = await context.params;
  return providerParamSchema.parse(provider) as AIProviderId;
}

export async function PUT(request: Request, context: RouteContext) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  try {
    const provider = await getValidatedProvider(context);
    const body = providerProfileBodySchema.parse(await request.json());

    await saveUserProviderProfile(user.id, provider, body);
    return apiSuccess({ saved: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "请求参数不合法。");
    }

    return apiError(getErrorMessage(error, "保存 Provider 配置失败。"), 500, "PROFILE_SAVE_FAILED");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  try {
    const provider = await getValidatedProvider(context);
    await deleteUserProviderProfile(user.id, provider);
    return apiSuccess({ deleted: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "请求参数不合法。");
    }

    return apiError(getErrorMessage(error, "删除 Provider 配置失败。"), 500, "PROFILE_DELETE_FAILED");
  }
}
