import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { getUserProviderConfigInput } from "@/lib/provider-configs";
import { resolveProbeProviderConfig, testProviderConnection } from "@/lib/provider-probe";

export const runtime = "nodejs";

const providerConfigSchema = z.object({
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

const requestSchema = z
  .object({
    configId: z.string().trim().min(1).optional(),
    providerConfig: providerConfigSchema.optional()
  })
  .refine((value) => value.configId || value.providerConfig, {
    message: "请选择一个配置，或传入当前草稿。",
    path: ["configId"]
  });

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
    const body = requestSchema.parse(await request.json());
    const providerConfigInput = body.configId
      ? await getUserProviderConfigInput(user.id, body.configId)
      : body.providerConfig;

    if (!providerConfigInput) {
      return apiError("配置不存在。", 404, "PROVIDER_CONFIG_NOT_FOUND");
    }

    const providerConfig = resolveProbeProviderConfig(providerConfigInput);
    const result = await testProviderConnection(providerConfig);

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "测试参数不合法。");
    }

    return apiError(getErrorMessage(error, "连通性测试失败。"), 500, "PROVIDER_CONNECTIVITY_TEST_FAILED");
  }
}
