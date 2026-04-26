import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess, getErrorMessage } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { setActiveUserProviderConfig } from "@/lib/provider-configs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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
    await setActiveUserProviderConfig(user.id, id);

    return apiSuccess({ activated: true, id });
  } catch (error) {
    return apiError(getErrorMessage(error, "切换配置失败。"), 500, "PROVIDER_CONFIG_ACTIVATE_FAILED");
  }
}
