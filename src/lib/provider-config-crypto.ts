import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env, normalizeOptional, resolveProviderConfig } from "@/lib/env";
import type {
  AIProviderConfig,
  AIProviderConfigInput,
  AIProviderConfigSnapshot,
  AIProviderId
} from "@/lib/ai/types";

const ENCRYPTION_VERSION = "v1";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const secret = normalizeOptional(env.ANALYSIS_TASK_ENCRYPTION_KEY);
  if (!secret) {
    return null;
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

function requireEncryptionKey() {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "服务器未配置 ANALYSIS_TASK_ENCRYPTION_KEY，暂不支持保存自定义 Provider 凭证。请改用 .env 中的服务端默认配置，或先设置该环境变量。"
    );
  }

  return key;
}

export function buildProviderConfigSnapshot(input: AIProviderConfigInput): AIProviderConfigSnapshot | null {
  const snapshot: AIProviderConfigSnapshot = {};
  const apiKey = normalizeOptional(input.apiKey);
  const baseURL = normalizeOptional(input.baseURL);
  const siteUrl = normalizeOptional(input.siteUrl);
  const appName = normalizeOptional(input.appName);

  if (input.protocol) {
    snapshot.protocol = input.protocol;
  }

  if (input.apiKeyMode) {
    snapshot.apiKeyMode = input.apiKeyMode;
  }

  if (apiKey) {
    snapshot.apiKey = apiKey;
  }

  if (baseURL) {
    snapshot.baseURL = baseURL;
  }

  if (siteUrl) {
    snapshot.siteUrl = siteUrl;
  }

  if (appName) {
    snapshot.appName = appName;
  }

  const proxy = normalizeOptional(input.proxy);
  if (proxy) {
    snapshot.proxy = proxy;
  }

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

export function encryptProviderConfigSnapshot(snapshot: AIProviderConfigSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, requireEncryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(snapshot), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".");
}

export function decryptProviderConfigSnapshot(payload?: string | null): AIProviderConfigSnapshot | null {
  if (!payload) {
    return null;
  }

  try {
    const [version, ivValue, authTagValue, ciphertextValue] = payload.split(".");
    if (version !== ENCRYPTION_VERSION || !ivValue || !authTagValue || !ciphertextValue) {
      throw new Error("任务中的 Provider 配置快照格式无效。");
    }

    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      requireEncryptionKey(),
      Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, "base64url")),
      decipher.final()
    ]);

    return JSON.parse(plaintext.toString("utf8")) as AIProviderConfigSnapshot;
  } catch (error) {
    if (error instanceof Error && error.message.includes("ANALYSIS_TASK_ENCRYPTION_KEY")) {
      throw error;
    }
    throw new Error("Provider 配置快照解密失败，数据可能已损坏或密钥已更换。");
  }
}

export function resolveTaskProviderConfig(task: {
  provider: string;
  model: string;
  providerConfigEncrypted?: string | null;
}): AIProviderConfig {
  const snapshot = decryptProviderConfigSnapshot(task.providerConfigEncrypted);

  return resolveProviderConfig({
    provider: task.provider as AIProviderId,
    model: task.model,
    ...snapshot
  });
}
