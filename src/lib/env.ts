import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import {
  getDefaultApiKeyModeForProvider,
  getDefaultProtocolForProvider,
  type AIProviderConfig,
  type AIProviderConfigInput,
  type AIProviderId
} from "@/lib/ai/types";
import { getDefaultBaseURL, getDefaultModel } from "@/lib/provider-settings";

// Ensure standalone scripts and workers load the same .env files as Next.js.
loadEnvConfig(process.cwd());

const providerEnum = z.enum([
  "openai",
  "openrouter",
  "compatible",
  "nvidia",
  "gemini",
  "anthropic"
]);

const apiKeyModeEnum = z.enum(["bearer", "api_key_header", "x_api_key_header"]);

const envSchema = z.object({
  APP_ORIGIN: z.string().default(""),
  EMAIL_DELIVERY_MODE: z.enum(["console", "file"]).default("file"),
  EMAIL_FROM: z.string().default("no-reply@resume-optimizer.local"),
  EMAIL_OUTBOX_DIR: z.string().default("storage/email-outbox"),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  SESSION_DURATION_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_REFRESH_THRESHOLD_HOURS: z.coerce.number().int().positive().default(72),
  AI_PROVIDER: providerEnum.default("openai"),

  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default(getDefaultModel("openai")),

  OPENROUTER_API_KEY: z.string().default(""),
  OPENROUTER_MODEL: z.string().default(getDefaultModel("openrouter")),
  OPENROUTER_BASE_URL: z.string().default(getDefaultBaseURL("openrouter")),
  OPENROUTER_SITE_URL: z.string().default(""),
  OPENROUTER_APP_NAME: z.string().default("resume-optimizer"),

  AI_COMPATIBLE_API_KEY: z.string().default(""),
  AI_COMPATIBLE_BASE_URL: z.string().default(""),
  AI_COMPATIBLE_MODEL: z.string().default(getDefaultModel("compatible")),
  AI_COMPATIBLE_API_KEY_MODE: apiKeyModeEnum.default("bearer"),

  NVIDIA_API_KEY: z.string().default(""),
  NVIDIA_MODEL: z.string().default(getDefaultModel("nvidia")),
  NVIDIA_BASE_URL: z.string().default(getDefaultBaseURL("nvidia")),

  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default(getDefaultModel("gemini")),
  GEMINI_BASE_URL: z.string().default(getDefaultBaseURL("gemini")),

  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_MODEL: z.string().default(getDefaultModel("anthropic")),
  ANTHROPIC_BASE_URL: z.string().default(getDefaultBaseURL("anthropic")),

  ANALYSIS_TASK_ENCRYPTION_KEY: z.string().default(""),
  ANALYSIS_TASK_TIMEOUT_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
  ANALYSIS_TASK_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  ANALYSIS_TASK_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  ANALYSIS_QUEUE_NAME: z.string().default("analysis-tasks"),
  TASK_GUARD_SECRET: z.string().default(""),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("storage"),
  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().default("resume-optimizer"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_PUBLIC_BASE_URL: z.string().default("")
});

const parsedEnv = envSchema.parse({
  APP_ORIGIN: process.env.APP_ORIGIN,
  EMAIL_DELIVERY_MODE: process.env.EMAIL_DELIVERY_MODE,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_OUTBOX_DIR: process.env.EMAIL_OUTBOX_DIR,
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: process.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  SESSION_DURATION_DAYS: process.env.SESSION_DURATION_DAYS,
  SESSION_REFRESH_THRESHOLD_HOURS: process.env.SESSION_REFRESH_THRESHOLD_HOURS,
  AI_PROVIDER: process.env.AI_PROVIDER,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
  OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
  OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME,

  AI_COMPATIBLE_API_KEY: process.env.AI_COMPATIBLE_API_KEY,
  AI_COMPATIBLE_BASE_URL: process.env.AI_COMPATIBLE_BASE_URL,
  AI_COMPATIBLE_MODEL: process.env.AI_COMPATIBLE_MODEL,
  AI_COMPATIBLE_API_KEY_MODE: process.env.AI_COMPATIBLE_API_KEY_MODE,

  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  NVIDIA_MODEL: process.env.NVIDIA_MODEL,
  NVIDIA_BASE_URL: process.env.NVIDIA_BASE_URL,

  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_BASE_URL: process.env.GEMINI_BASE_URL,

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,

  ANALYSIS_TASK_ENCRYPTION_KEY: process.env.ANALYSIS_TASK_ENCRYPTION_KEY,
  ANALYSIS_TASK_TIMEOUT_MS: process.env.ANALYSIS_TASK_TIMEOUT_MS,
  ANALYSIS_TASK_MAX_ATTEMPTS: process.env.ANALYSIS_TASK_MAX_ATTEMPTS,
  ANALYSIS_TASK_WORKER_CONCURRENCY: process.env.ANALYSIS_TASK_WORKER_CONCURRENCY,
  ANALYSIS_QUEUE_NAME: process.env.ANALYSIS_QUEUE_NAME,
  TASK_GUARD_SECRET: process.env.TASK_GUARD_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  STORAGE_DRIVER: process.env.STORAGE_DRIVER,
  LOCAL_STORAGE_DIR: process.env.LOCAL_STORAGE_DIR,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL
});

export function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const env = {
  ...parsedEnv,
  AI_PROVIDER: parsedEnv.AI_PROVIDER as AIProviderId
};

export function resolveProviderConfig(input: AIProviderConfigInput): AIProviderConfig {
  const protocol = input.protocol ?? getDefaultProtocolForProvider(input.provider);
  const defaultApiKeyMode = getDefaultApiKeyModeForProvider(input.provider);

  switch (input.provider) {
    case "openrouter": {
      const apiKey = normalizeOptional(input.apiKey) ?? normalizeOptional(env.OPENROUTER_API_KEY);
      const model = normalizeOptional(input.model) ?? normalizeOptional(env.OPENROUTER_MODEL);
      const baseURL = normalizeOptional(input.baseURL) ?? normalizeOptional(env.OPENROUTER_BASE_URL);
      const siteUrl = normalizeOptional(input.siteUrl) ?? normalizeOptional(env.OPENROUTER_SITE_URL);
      const appName = normalizeOptional(input.appName) ?? normalizeOptional(env.OPENROUTER_APP_NAME);

      if (!apiKey) {
        throw new Error("请填写 OpenRouter API Key，或在 .env 中配置 OPENROUTER_API_KEY。");
      }

      return {
        provider: input.provider,
        protocol,
        apiKeyMode: defaultApiKeyMode,
        apiKey,
        model: model ?? getDefaultModel("openrouter"),
        baseURL: baseURL ?? getDefaultBaseURL("openrouter"),
        siteUrl,
        appName
      };
    }

    case "compatible": {
      const apiKey = normalizeOptional(input.apiKey) ?? normalizeOptional(env.AI_COMPATIBLE_API_KEY);
      const model = normalizeOptional(input.model) ?? normalizeOptional(env.AI_COMPATIBLE_MODEL);
      const baseURL = normalizeOptional(input.baseURL) ?? normalizeOptional(env.AI_COMPATIBLE_BASE_URL);
      const apiKeyMode = input.apiKeyMode ?? env.AI_COMPATIBLE_API_KEY_MODE ?? defaultApiKeyMode;

      if (!apiKey) {
        throw new Error("请填写兼容接口的 API Key，或在 .env 中配置 AI_COMPATIBLE_API_KEY。");
      }
      if (!baseURL) {
        throw new Error("请填写兼容接口的 Base URL，或在 .env 中配置 AI_COMPATIBLE_BASE_URL。");
      }

      return {
        provider: input.provider,
        protocol,
        apiKeyMode,
        apiKey,
        model: model ?? getDefaultModel("compatible"),
        baseURL
      };
    }

    case "nvidia": {
      const apiKey = normalizeOptional(input.apiKey) ?? normalizeOptional(env.NVIDIA_API_KEY);
      const model = normalizeOptional(input.model) ?? normalizeOptional(env.NVIDIA_MODEL);
      const baseURL = normalizeOptional(input.baseURL) ?? normalizeOptional(env.NVIDIA_BASE_URL);

      if (!apiKey) {
        throw new Error("请填写 NVIDIA API Key，或在 .env 中配置 NVIDIA_API_KEY。");
      }

      return {
        provider: input.provider,
        protocol,
        apiKeyMode: defaultApiKeyMode,
        apiKey,
        model: model ?? getDefaultModel("nvidia"),
        baseURL: baseURL ?? getDefaultBaseURL("nvidia")
      };
    }

    case "gemini": {
      const apiKey = normalizeOptional(input.apiKey) ?? normalizeOptional(env.GEMINI_API_KEY);
      const model = normalizeOptional(input.model) ?? normalizeOptional(env.GEMINI_MODEL);
      const baseURL = normalizeOptional(input.baseURL) ?? normalizeOptional(env.GEMINI_BASE_URL);

      if (!apiKey) {
        throw new Error("请填写 Gemini API Key，或在 .env 中配置 GEMINI_API_KEY。");
      }

      return {
        provider: input.provider,
        protocol,
        apiKeyMode: defaultApiKeyMode,
        apiKey,
        model: model ?? getDefaultModel("gemini"),
        baseURL: baseURL ?? getDefaultBaseURL("gemini")
      };
    }

    case "anthropic": {
      const apiKey = normalizeOptional(input.apiKey) ?? normalizeOptional(env.ANTHROPIC_API_KEY);
      const model = normalizeOptional(input.model) ?? normalizeOptional(env.ANTHROPIC_MODEL);
      const baseURL = normalizeOptional(input.baseURL) ?? normalizeOptional(env.ANTHROPIC_BASE_URL);

      if (!apiKey) {
        throw new Error("请填写 Anthropic API Key，或在 .env 中配置 ANTHROPIC_API_KEY。");
      }

      return {
        provider: input.provider,
        protocol,
        apiKeyMode: defaultApiKeyMode,
        apiKey,
        model: model ?? getDefaultModel("anthropic"),
        baseURL: baseURL ?? getDefaultBaseURL("anthropic")
      };
    }

    case "openai":
    default: {
      const apiKey = normalizeOptional(input.apiKey) ?? normalizeOptional(env.OPENAI_API_KEY);
      const model = normalizeOptional(input.model) ?? normalizeOptional(env.OPENAI_MODEL);

      if (!apiKey) {
        throw new Error("请填写 OpenAI API Key，或在 .env 中配置 OPENAI_API_KEY。");
      }

      return {
        provider: "openai",
        protocol,
        apiKeyMode: defaultApiKeyMode,
        apiKey,
        model: model ?? getDefaultModel("openai")
      };
    }
  }
}
