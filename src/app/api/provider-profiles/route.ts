import { getCurrentUser } from "@/lib/auth";
import { listUserProviderProfiles } from "@/lib/provider-profiles";
import { apiError, apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  const profiles = await listUserProviderProfiles(user.id);
  return apiSuccess(profiles);
}
