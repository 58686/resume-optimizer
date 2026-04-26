import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import {
  createUserProviderConfig,
  listUserProviderConfigs
} from "@/lib/provider-configs";

export const runtime = "nodejs";

const providerConfigBodySchema = z.object({
  name: z.string().trim().min(1, "配置名称不能为空。").max(60, "配置名称过长。"),
  provider: z.enum(["openai", "openrouter", "compatible", "nvidia", "gemini", "anthropic"]),
  protocol: z.enum(["responses", "chat_completions"]).optional(),
  apiKeyMode: z.enum(["bearer", "api_key_header", "x_api_key_header"]).optional(),
  apiKey: z.string().trim().max(500, "API Key 过长。").optional(),
  model: z.string().trim().max(200, "模型名称过长。").optional(),
  baseURL: z.string().trim().max(500, "Base URL 过长。").optional(),
  siteUrl: z.string().trim().max(500, "站点 URL 过长。").optional(),
  appName: z.string().trim().max(100, "应用名称过长。").optional(),
  proxy: z.string().trim().max(500, "代理地址过长。").optional()
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  return apiSuccess(await listUserProviderConfigs(user.id));
}

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  try {
    const body = providerConfigBodySchema.parse(await request.json());
    const id = await createUserProviderConfig(user.id, body);

    return apiSuccess({ id, created: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "配置参数不合法。");
    }

    return apiError(getErrorMessage(error, "创建配置失败。"), 500, "PROVIDER_CONFIG_CREATE_FAILED");
  }
}
