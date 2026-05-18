import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { getUserProviderConfigInput } from "@/lib/provider-configs";
import { listProviderModels, resolveProbeProviderConfig } from "@/lib/provider-probe";
import { providerConfigSchema } from "@/lib/request-schemas";

export const runtime = "nodejs";

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
    const models = await listProviderModels(providerConfig);

    return apiSuccess({
      provider: providerConfig.provider,
      count: models.length,
      models
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "模型列表参数不合法。");
    }

    return apiError(getErrorMessage(error, "拉取模型列表失败。"), 500, "PROVIDER_MODELS_LIST_FAILED");
  }
}
