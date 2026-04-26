import {
  getDefaultApiKeyModeForProvider,
  getDefaultProtocolForProvider,
  type AIApiKeyMode,
  type AIProtocol,
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
import {
  PROVIDER_IDS,
  createDefaultProviderMetaMap,
  createDefaultProviderValuesMap,
  getDefaultModel
} from "@/lib/provider-settings";

type ProviderProfileRecord = {
  provider: string;
  model: string;
  configEncrypted: string | null;
  updatedAt: Date;
};

type ProviderProfilesResponseItem = {
  protocol: AIProtocol;
  apiKeyMode: AIApiKeyMode;
  model: string;
  baseURL: string;
  siteUrl: string;
  appName: string;
  hasApiKey: boolean;
  isSaved: boolean;
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
    appName: snapshot.appName,
    proxy: snapshot.proxy
  };
}

function decodeProfile(profile?: ProviderProfileRecord | null) {
  if (!profile) {
    return null;
  }

  return {
    provider: profile.provider as AIProviderId,
    model: profile.model,
    snapshot: sanitizeSnapshot(decryptProviderConfigSnapshot(profile.configEncrypted)),
    updatedAt: profile.updatedAt
  };
}

async function getProviderProfileRecord(userId: string, provider: AIProviderId) {
  return prisma.providerProfile.findUnique({
    where: {
      userId_provider: { userId, provider }
    },
    select: {
      provider: true,
      model: true,
      configEncrypted: true,
      updatedAt: true
    }
  });
}

export async function buildAnalyzeProviderConfigInput(userId: string, input: AIProviderConfigInput) {
  const provider = input.provider;
  const profile = decodeProfile(await getProviderProfileRecord(userId, provider));

  return {
    provider,
    protocol: pickValue({
      providedValue: input.protocol,
      fallbackValue: profile?.snapshot?.protocol ?? getDefaultProtocolForProvider(provider),
      preserveFallbackOnBlank: true
    }),
    apiKeyMode: pickValue({
      providedValue: input.apiKeyMode,
      fallbackValue: profile?.snapshot?.apiKeyMode ?? getDefaultApiKeyModeForProvider(provider),
      preserveFallbackOnBlank: true
    }),
    model: pickValue({
      providedValue: input.model,
      fallbackValue: profile?.model ?? getDefaultModel(provider),
      preserveFallbackOnBlank: true
    }),
    apiKey: pickValue({
      providedValue: input.apiKey,
      fallbackValue: profile?.snapshot?.apiKey,
      preserveFallbackOnBlank: true
    }),
    baseURL: pickValue({
      providedValue: input.baseURL,
      fallbackValue: profile?.snapshot?.baseURL,
      preserveFallbackOnBlank: true
    }),
    siteUrl: pickValue({
      providedValue: input.siteUrl,
      fallbackValue: profile?.snapshot?.siteUrl,
      preserveFallbackOnBlank: true
    }),
    appName: pickValue({
      providedValue: input.appName,
      fallbackValue: profile?.snapshot?.appName,
      preserveFallbackOnBlank: true
    })
  } satisfies AIProviderConfigInput;
}

export async function listUserProviderProfiles(userId: string) {
  const profiles = await prisma.providerProfile.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      provider: true,
      model: true,
      configEncrypted: true,
      updatedAt: true
    }
  });

  const values = createDefaultProviderValuesMap();
  const meta = createDefaultProviderMetaMap();

  for (const record of profiles) {
    const provider = record.provider as AIProviderId;
    const decoded = decodeProfile(record);
    const snapshot = decoded?.snapshot;

    values[provider] = {
      protocol: snapshot?.protocol ?? getDefaultProtocolForProvider(provider),
      apiKeyMode: snapshot?.apiKeyMode ?? getDefaultApiKeyModeForProvider(provider),
      apiKey: "",
      model: decoded?.model ?? getDefaultModel(provider),
      baseURL: snapshot?.baseURL ?? values[provider].baseURL,
      siteUrl: snapshot?.siteUrl ?? values[provider].siteUrl,
      appName: snapshot?.appName ?? values[provider].appName,
      proxy: snapshot?.proxy ?? values[provider].proxy
    };

    meta[provider] = {
      hasApiKey: Boolean(snapshot?.apiKey),
      isSaved: true
    };
  }

  const lastProvider = (profiles[0]?.provider as AIProviderId | undefined) ?? "openai";
  const responseProfiles = {} as Record<AIProviderId, ProviderProfilesResponseItem>;

  for (const provider of PROVIDER_IDS) {
    responseProfiles[provider] = {
      protocol: values[provider].protocol,
      apiKeyMode: values[provider].apiKeyMode,
      model: values[provider].model,
      baseURL: values[provider].baseURL,
      siteUrl: values[provider].siteUrl,
      appName: values[provider].appName,
      hasApiKey: meta[provider].hasApiKey,
      isSaved: meta[provider].isSaved
    };
  }

  return {
    lastProvider,
    profiles: responseProfiles
  };
}

export async function saveUserProviderProfile(
  userId: string,
  provider: AIProviderId,
  input: Omit<AIProviderConfigInput, "provider">
) {
  const existing = decodeProfile(await getProviderProfileRecord(userId, provider));
  const defaultProtocol = getDefaultProtocolForProvider(provider);
  const defaultApiKeyMode = getDefaultApiKeyModeForProvider(provider);

  const model =
    pickValue({
      providedValue: input.model,
      fallbackValue: existing?.model ?? getDefaultModel(provider),
      preserveFallbackOnBlank: false
    }) ?? getDefaultModel(provider);

  const protocol =
    pickValue({
      providedValue: input.protocol,
      fallbackValue: existing?.snapshot?.protocol ?? defaultProtocol,
      preserveFallbackOnBlank: false
    }) ?? defaultProtocol;

  const apiKeyMode =
    pickValue({
      providedValue: input.apiKeyMode,
      fallbackValue: existing?.snapshot?.apiKeyMode ?? defaultApiKeyMode,
      preserveFallbackOnBlank: false
    }) ?? defaultApiKeyMode;

  const snapshot = sanitizeSnapshot({
    protocol: protocol === defaultProtocol ? undefined : protocol,
    apiKeyMode: apiKeyMode === defaultApiKeyMode ? undefined : apiKeyMode,
    apiKey: pickValue({
      providedValue: input.apiKey,
      fallbackValue: existing?.snapshot?.apiKey,
      preserveFallbackOnBlank: true
    }),
    baseURL: pickValue({
      providedValue: input.baseURL,
      fallbackValue: existing?.snapshot?.baseURL,
      preserveFallbackOnBlank: false
    }),
    siteUrl: pickValue({
      providedValue: input.siteUrl,
      fallbackValue: existing?.snapshot?.siteUrl,
      preserveFallbackOnBlank: false
    }),
    appName: pickValue({
      providedValue: input.appName,
      fallbackValue: existing?.snapshot?.appName,
      preserveFallbackOnBlank: false
    })
  });

  const isDefaultModel = model === getDefaultModel(provider);
  const hasCustomSnapshot = Boolean(snapshot && Object.values(snapshot).some(Boolean));

  if (!hasCustomSnapshot && isDefaultModel) {
    await prisma.providerProfile.deleteMany({
      where: { userId, provider }
    });

    return { deleted: true };
  }

  await prisma.providerProfile.upsert({
    where: {
      userId_provider: { userId, provider }
    },
    create: {
      userId,
      provider,
      model,
      configEncrypted: encryptProviderConfigSnapshot(snapshot)
    },
    update: {
      model,
      configEncrypted: encryptProviderConfigSnapshot(snapshot)
    }
  });

  return { deleted: false };
}

export async function deleteUserProviderProfile(userId: string, provider: AIProviderId) {
  await prisma.providerProfile.deleteMany({
    where: { userId, provider }
  });
}
