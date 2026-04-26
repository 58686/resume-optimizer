import type { ApiEnvelope } from "@/lib/api-response";

type LegacyErrorShape = {
  error?: string;
};

export async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T> | LegacyErrorShape | T;

  if (payload && typeof payload === "object" && "success" in payload) {
    if (!payload.success) {
      throw new Error(payload.error.message);
    }

    return payload.data;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "请求失败，请稍后重试。";

    throw new Error(message);
  }

  return payload as T;
}
