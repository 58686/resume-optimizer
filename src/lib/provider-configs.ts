import {
  getDefaultApiKeyModeForProvider,
  getDefaultProtocolForProvider,
  type AIProviderConfigInput,
  type AIProviderConfigSnapshot,
  type AIProviderId
} from "@/lib/ai/types";
import { normalizeOptional } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  decryptProviderConfigSnapshot,
  encryptProviderConfigSnapshot
} from "@/lib/provider-config-crypto";
import { resolveProbeProviderConfig, testProviderConnection } from "@/lib/provider-probe";
import {
  getDefaultModel,
  getDefaultProviderValues,
  getProviderLabel,
  type ProviderFormValues
} from "@/lib/provider-settings";

type ProviderConfigRecord = {
  id: string;
  name: string;
  provider: string;
  model: string;
  configEncrypted: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserProviderConfigSummary = {
  id: string;
  name: string;
  provider: AIProviderId;
  values: ProviderFormValues;
  hasApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProviderConfigMutationInput = {
  provider: AIProviderId;
  protocol?: AIProviderConfigInput["protocol"];
  apiKeyMode?: AIProviderConfigInput["apiKeyMode"];
  apiKey?: string;
  model?: string;
  baseURL?: string;
  siteUrl?: string;
  appName?: string;
};

function pickValue<T extends string>(options: {
  providedValue?: T;
  fallbackValue?: T;
  preserveFallbackOnBlank: boolean;
}) {
  if (options.providedValue === undefined) {
    return options.fallbackValue;
  }

  const normalized = normalizeOptional(options.providedValue) as T | undefined;
  if (normalized) {
    return normalized;
  }

  return options.preserveFallbackOnBlank ? options.fallbackValue : undefined;
}

function sanitizeSnapshot(snapshot: AIProviderConfigSnapshot | null) {
  if (!snapshot) {
    return null;
  }

  return {
    protocol: snapshot.protocol,
    apiKeyMode: snapshot.apiKeyMode,
    apiKey: snapshot.apiKey,
    baseURL: snapshot.baseURL,
    siteUrl: snapshot.siteUrl,
    appName: snapshot.appName
  };
}

function decodeRecord(record: ProviderConfigRecord) {
  const provider = record.provider as AIProviderId;
  const defaults = getDefaultProviderValues(provider);
  const snapshot = sanitizeSnapshot(decryptProviderConfigSnapshot(record.configEncrypted));

  return {
    id: record.id,
    name: record.name,
    provider,
    model: record.model,
    snapshot,
    values: {
      protocol: snapshot?.protocol ?? defaults.protocol,
      apiKeyMode: snapshot?.apiKeyMode ?? defaults.apiKeyMode,
      apiKey: "",
      model: record.model,
      baseURL: snapshot?.baseURL ?? defaults.baseURL,
      siteUrl: snapshot?.siteUrl ?? defaults.siteUrl,
      appName: snapshot?.appName ?? defaults.appName
    } satisfies ProviderFormValues,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt
  };
}

async function migrateLegacyProviderProfilesIfNeeded(userId: string) {
  const existingCount = await prisma.providerConfig.count({
    where: { userId }
  });

  if (existingCount > 0) {
    return;
  }

  const legacyProfiles = await prisma.providerProfile.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      provider: true,
      model: true,
      configEncrypted: true,
      updatedAt: true,
      createdAt: true
    }
  });

  if (legacyProfiles.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    let activeConfigId: string | null = null;

    for (const [index, profile] of legacyProfiles.entries()) {
      const provider = profile.provider as AIProviderId;
      const created = await tx.providerConfig.create({
        data: {
          userId,
          name: `${getProviderLabel(provider)} 默认`,
          provider,
          model: profile.model,
          configEncrypted: profile.configEncrypted
        }
      });

      if (index === 0) {
        activeConfigId = created.id;
      }
    }

    if (activeConfigId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          activeProviderConfigId: activeConfigId
        }
      });
    }
  });
}

async function getProviderConfigRecord(userId: string, id: string) {
  await migrateLegacyProviderProfilesIfNeeded(userId);

  return prisma.providerConfig.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      provider: true,
      model: true,
      configEncrypted: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function listUserProviderConfigs(userId: string) {
  await migrateLegacyProviderProfilesIfNeeded(userId);

  const [user, records] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeProviderConfigId: true }
    }),
    prisma.providerConfig.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        provider: true,
        model: true,
        configEncrypted: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ]);

  const configs: UserProviderConfigSummary[] = records.map((record) => {
    const decoded = decodeRecord(record);

    return {
      id: decoded.id,
      name: decoded.name,
      provider: decoded.provider,
      values: decoded.values,
      hasApiKey: Boolean(decoded.snapshot?.apiKey),
      isActive: user?.activeProviderConfigId === decoded.id,
      createdAt: decoded.createdAt.toISOString(),
      updatedAt: decoded.updatedAt.toISOString()
    };
  });

  if (!user?.activeProviderConfigId && configs[0]) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeProviderConfigId: configs[0].id }
    });
    configs[0].isActive = true;
  }

  return {
    activeConfigId: configs.find((item) => item.isActive)?.id ?? null,
    configs
  };
}

export async function getUserProviderConfigInput(userId: string, configId: string) {
  const record = await getProviderConfigRecord(userId, configId);

  if (!record) {
    return null;
  }

  const decoded = decodeRecord(record);

  return {
    provider: decoded.provider,
    protocol: decoded.values.protocol,
    apiKeyMode: decoded.values.apiKeyMode,
    apiKey: decoded.snapshot?.apiKey,
    model: decoded.values.model,
    baseURL: decoded.values.baseURL,
    siteUrl: decoded.values.siteUrl,
    appName: decoded.values.appName
  } satisfies AIProviderConfigInput;
}

export async function createUserProviderConfig(
  userId: string,
  input: {
    name: string;
    provider: AIProviderId;
  } & Omit<AIProviderConfigInput, "provider">
) {
  const provider = input.provider;
  const name = normalizeOptional(input.name);

  if (!name) {
    throw new Error("配置名称不能为空。");
  }

  const model =
    pickValue({
      providedValue: input.model,
      fallbackValue: getDefaultModel(provider),
      preserveFallbackOnBlank: false
    }) ?? getDefaultModel(provider);

  const snapshot = sanitizeSnapshot({
    protocol:
      pickValue({
        providedValue: input.protocol,
        fallbackValue: getDefaultProtocolForProvider(provider),
        preserveFallbackOnBlank: false
      }) ?? getDefaultProtocolForProvider(provider),
    apiKeyMode:
      pickValue({
        providedValue: input.apiKeyMode,
        fallbackValue: getDefaultApiKeyModeForProvider(provider),
        preserveFallbackOnBlank: false
      }) ?? getDefaultApiKeyModeForProvider(provider),
    apiKey: pickValue({
      providedValue: input.apiKey,
      fallbackValue: undefined,
      preserveFallbackOnBlank: false
    }),
    baseURL: pickValue({
      providedValue: input.baseURL,
      fallbackValue: undefined,
      preserveFallbackOnBlank: false
    }),
    siteUrl: pickValue({
      providedValue: input.siteUrl,
      fallbackValue: undefined,
      preserveFallbackOnBlank: false
    }),
    appName: pickValue({
      providedValue: input.appName,
      fallbackValue: undefined,
      preserveFallbackOnBlank: false
    })
  });

  await validateProviderConfigBeforeSave({
    provider,
    protocol: snapshot?.protocol,
    apiKeyMode: snapshot?.apiKeyMode,
    apiKey: snapshot?.apiKey,
    model,
    baseURL: snapshot?.baseURL,
    siteUrl: snapshot?.siteUrl,
    appName: snapshot?.appName
  });

  const created = await prisma.providerConfig.create({
    data: {
      userId,
      name,
      provider,
      model,
      configEncrypted: encryptProviderConfigSnapshot(snapshot)
    },
    select: { id: true }
  });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeProviderConfigId: true }
  });

  if (!currentUser?.activeProviderConfigId) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeProviderConfigId: created.id }
    });
  }

  return created.id;
}

export async function updateUserProviderConfig(
  userId: string,
  configId: string,
  input: Partial<{
    name: string;
    provider: AIProviderId;
    protocol: AIProviderConfigInput["protocol"];
    apiKeyMode: AIProviderConfigInput["apiKeyMode"];
    apiKey: string;
    model: string;
    baseURL: string;
    siteUrl: string;
    appName: string;
  }>
) {
  const record = await getProviderConfigRecord(userId, configId);

  if (!record) {
    throw new Error("配置不存在。");
  }

  const decoded = decodeRecord(record);
  const nextProvider = input.provider ?? decoded.provider;
  const nextName = input.name === undefined ? record.name : normalizeOptional(input.name);

  if (!nextName) {
    throw new Error("配置名称不能为空。");
  }

  const nextModel =
    pickValue({
      providedValue: input.model,
      fallbackValue: decoded.model,
      preserveFallbackOnBlank: false
    }) ?? getDefaultModel(nextProvider);

  const nextSnapshot = sanitizeSnapshot({
    protocol:
      pickValue({
        providedValue: input.protocol,
        fallbackValue:
          decoded.snapshot?.protocol ?? getDefaultProtocolForProvider(nextProvider),
        preserveFallbackOnBlank: false
      }) ?? getDefaultProtocolForProvider(nextProvider),
    apiKeyMode:
      pickValue({
        providedValue: input.apiKeyMode,
        fallbackValue:
          decoded.snapshot?.apiKeyMode ?? getDefaultApiKeyModeForProvider(nextProvider),
        preserveFallbackOnBlank: false
      }) ?? getDefaultApiKeyModeForProvider(nextProvider),
    apiKey: pickValue({
      providedValue: input.apiKey,
      fallbackValue: decoded.snapshot?.apiKey,
      preserveFallbackOnBlank: true
    }),
    baseURL: pickValue({
      providedValue: input.baseURL,
      fallbackValue: decoded.snapshot?.baseURL,
      preserveFallbackOnBlank: false
    }),
    siteUrl: pickValue({
      providedValue: input.siteUrl,
      fallbackValue: decoded.snapshot?.siteUrl,
      preserveFallbackOnBlank: false
    }),
    appName: pickValue({
      providedValue: input.appName,
      fallbackValue: decoded.snapshot?.appName,
      preserveFallbackOnBlank: false
    })
  });

  await validateProviderConfigBeforeSave({
    provider: nextProvider,
    protocol: nextSnapshot?.protocol,
    apiKeyMode: nextSnapshot?.apiKeyMode,
    apiKey: nextSnapshot?.apiKey,
    model: nextModel,
    baseURL: nextSnapshot?.baseURL,
    siteUrl: nextSnapshot?.siteUrl,
    appName: nextSnapshot?.appName
  });

  await prisma.providerConfig.update({
    where: { id: record.id },
    data: {
      name: nextName,
      provider: nextProvider,
      model: nextModel,
      configEncrypted: encryptProviderConfigSnapshot(nextSnapshot)
    }
  });
}

async function validateProviderConfigBeforeSave(input: ProviderConfigMutationInput) {
  const resolved = resolveProbeProviderConfig({
    provider: input.provider,
    protocol: input.protocol,
    apiKeyMode: input.apiKeyMode,
    apiKey: input.apiKey,
    model: input.model,
    baseURL: input.baseURL,
    siteUrl: input.siteUrl,
    appName: input.appName
  });

  try {
    await testProviderConnection(resolved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "连通性测试失败。";
    throw new Error(`保存前预检失败：${message}`);
  }
}

export async function setActiveUserProviderConfig(userId: string, configId: string) {
  const exists = await getProviderConfigRecord(userId, configId);
  if (!exists) {
    throw new Error("配置不存在。");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeProviderConfigId: configId }
  });
}

export async function deleteUserProviderConfig(userId: string, configId: string) {
  const record = await getProviderConfigRecord(userId, configId);

  if (!record) {
    throw new Error("配置不存在。");
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activeProviderConfigId: true }
    });

    await tx.providerConfig.delete({
      where: { id: configId }
    });

    if (user?.activeProviderConfigId === configId) {
      const fallback = await tx.providerConfig.findFirst({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true }
      });

      await tx.user.update({
        where: { id: userId },
        data: { activeProviderConfigId: fallback?.id ?? null }
      });
    }
  });
}
