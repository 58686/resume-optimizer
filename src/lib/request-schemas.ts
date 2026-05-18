import { z } from "zod";

export const aiProviderSchema = z.enum([
  "openai",
  "openrouter",
  "compatible",
  "nvidia",
  "gemini",
  "anthropic"
]);

export const aiProtocolSchema = z.enum(["responses", "chat_completions"]);

export const apiKeyModeSchema = z.enum([
  "bearer",
  "api_key_header",
  "x_api_key_header"
]);

export const providerConfigSchema = z.object({
  provider: aiProviderSchema,
  protocol: aiProtocolSchema.optional(),
  apiKeyMode: apiKeyModeSchema.optional(),
  apiKey: z.string().trim().max(500, "API Key 过长。").optional(),
  model: z.string().trim().max(200, "模型名称过长。").optional(),
  baseURL: z.string().trim().max(500, "Base URL 过长。").optional(),
  siteUrl: z.string().trim().max(500, "站点 URL 过长。").optional(),
  appName: z.string().trim().max(100, "应用名称过长。").optional(),
  proxy: z.string().trim().max(500, "代理地址过长。").optional()
});

export const resumeTextSchema = z
  .string()
  .trim()
  .min(50, "简历内容至少需要 50 个字符。")
  .max(30000, "简历内容过长，请精简后再试。");

export const jobDescriptionSchema = z
  .string()
  .trim()
  .min(30, "职位描述至少需要 30 个字符。")
  .max(16000, "职位描述过长，请仅保留核心职责和要求。");
