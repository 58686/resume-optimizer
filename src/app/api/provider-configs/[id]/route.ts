import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import {
  deleteUserProviderConfig,
  updateUserProviderConfig
} from "@/lib/provider-configs";

export const runtime = "nodejs";

const updateBodySchema = z.object({
  name: z.string().trim().min(1, "配置名称不能为空。").max(60, "配置名称过长。").optional(),
  provider: z.enum(["openai", "openrouter", "compatible", "nvidia", "gemini", "anthropic"]).optional(),
  protocol: z.enum(["responses", "chat_completions"]).optional(),
  apiKeyMode: z.enum(["bearer", "api_key_header", "x_api_key_header"]).optional(),
  apiKey: z.string().trim().max(500, "API Key 过长。").optional(),
  model: z.string().trim().max(200, "模型名称过长。").optional(),
  baseURL: z.string().trim().max(500, "Base URL 过长。").optional(),
  siteUrl: z.string().trim().max(500, "站点 URL 过长。").optional(),
  appName: z.string().trim().max(100, "应用名称过长。").optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  try {
    const body = updateBodySchema.parse(await request.json());
    const { id } = await context.params;
    await updateUserProviderConfig(user.id, id, body);

    return apiSuccess({ updated: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "配置参数不合法。");
    }

    return apiError(getErrorMessage(error, "更新配置失败。"), 500, "PROVIDER_CONFIG_UPDATE_FAILED");
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
    const { id } = await context.params;
    await deleteUserProviderConfig(user.id, id);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(getErrorMessage(error, "删除配置失败。"), 500, "PROVIDER_CONFIG_DELETE_FAILED");
  }
}
