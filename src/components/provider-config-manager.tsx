"use client";

import { useEffect, useMemo, useState } from "react";
import { readApiResponse } from "@/lib/api-client";
import type { AIProviderId } from "@/lib/ai/types";
import { useToast } from "@/components/toast-provider";
import {
  PROVIDER_IDS,
  getDefaultModel,
  getDefaultProviderValues,
  getProviderLabel,
  getSupportedProtocols,
  providerSupportsApiKeyModeSelection,
  providerSupportsBaseURL,
  providerSupportsProtocolSelection,
  providerSupportsSiteMetadata,
  type ProviderFormValues
} from "@/lib/provider-settings";

type ProviderConfigItem = {
  id: string;
  name: string;
  provider: AIProviderId;
  values: ProviderFormValues;
  hasApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProviderConfigsPayload = {
  activeConfigId: string | null;
  configs: ProviderConfigItem[];
};

type DraftState = {
  id: string | null;
  name: string;
  provider: AIProviderId;
  values: ProviderFormValues;
  hasApiKey: boolean;
};

type ConnectivityResult = {
  ok: boolean;
  provider: string;
  baseURL: string;
  model: string;
  message: string;
};

type ModelsResult = {
  provider: string;
  count: number;
  models: string[];
};

function createDraft(provider: AIProviderId = "openai"): DraftState {
  return {
    id: null,
    name: "",
    provider,
    values: getDefaultProviderValues(provider),
    hasApiKey: false
  };
}

export function ProviderConfigManager() {
  const toast = useToast();
  const [configs, setConfigs] = useState<ProviderConfigItem[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(() => createDraft());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState("");
  const [connectivityResult, setConnectivityResult] = useState<ConnectivityResult | null>(null);
  const [modelsResult, setModelsResult] = useState<ModelsResult | null>(null);

  const activeConfig = useMemo(
    () => configs.find((item) => item.id === activeConfigId) ?? null,
    [activeConfigId, configs]
  );
  const protocolOptions = getSupportedProtocols(draft.provider);

  async function loadConfigs(preferredId?: string | null) {
    try {
      setIsLoading(true);
      const response = await fetch("/api/provider-configs", { cache: "no-store" });
      const data = await readApiResponse<ProviderConfigsPayload>(response);
      setConfigs(data.configs);
      setActiveConfigId(data.activeConfigId);

      const configToSelect =
        (preferredId && data.configs.find((item) => item.id === preferredId)) ||
        (data.activeConfigId && data.configs.find((item) => item.id === data.activeConfigId)) ||
        data.configs[0];

      if (configToSelect) {
        setDraft({
          id: configToSelect.id,
          name: configToSelect.name,
          provider: configToSelect.provider,
          values: { ...configToSelect.values, apiKey: "" },
          hasApiKey: configToSelect.hasApiKey
        });
      } else {
        setDraft(createDraft());
      }

      setError("");
      setConnectivityResult(null);
      setModelsResult(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载 AI 配置失败。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConfigs();
  }, []);

  function selectConfig(item: ProviderConfigItem) {
    setDraft({
      id: item.id,
      name: item.name,
      provider: item.provider,
      values: { ...item.values, apiKey: "" },
      hasApiKey: item.hasApiKey
    });
    setError("");
    setConnectivityResult(null);
    setModelsResult(null);
  }

  function updateDraftValues(patch: Partial<ProviderFormValues>) {
    setDraft((current) => ({
      ...current,
      values: {
        ...current.values,
        ...patch
      }
    }));
  }

  function buildDraftPayload() {
    return {
      name: draft.name,
      provider: draft.provider,
      protocol: draft.values.protocol,
      apiKeyMode: draft.values.apiKeyMode,
      apiKey: draft.values.apiKey,
      model: draft.values.model,
      baseURL: draft.values.baseURL,
      siteUrl: draft.values.siteUrl,
      appName: draft.values.appName
    };
  }

  function buildDiagnosticPayload() {
    if (draft.id) {
      return { configId: draft.id };
    }

    return { providerConfig: buildDraftPayload() };
  }

  async function saveDraft() {
    try {
      setIsSaving(true);
      setError("");
      setConnectivityResult(null);

      const preflightResponse = await fetch("/api/provider-configs/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildDiagnosticPayload())
      });
      const preflight = await readApiResponse<ConnectivityResult>(preflightResponse);
      setConnectivityResult(preflight);

      const response = await fetch(
        draft.id ? `/api/provider-configs/${draft.id}` : "/api/provider-configs",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildDraftPayload())
        }
      );

      const data = await readApiResponse<{ id?: string }>(response);
      const nextSelectedId = draft.id ?? data.id ?? null;
      await loadConfigs(nextSelectedId);
      toast({
        tone: "success",
        title: draft.id ? "配置已更新" : "配置已创建",
        description: "预检已通过，现在可以在上传页切换使用它。"
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存 AI 配置失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function activateConfig(id: string) {
    try {
      setIsActivating(true);
      setError("");
      const response = await fetch(`/api/provider-configs/${id}/activate`, { method: "POST" });
      await readApiResponse(response);
      await loadConfigs(id);
      toast({
        tone: "success",
        title: "已切换当前配置",
        description: "上传页会默认使用这组 AI 配置。"
      });
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "切换配置失败。");
    } finally {
      setIsActivating(false);
    }
  }

  async function deleteDraft() {
    if (!draft.id) {
      setDraft(createDraft(activeConfig?.provider ?? "openai"));
      setConnectivityResult(null);
      setModelsResult(null);
      return;
    }

    try {
      setIsDeleting(true);
      setError("");
      const response = await fetch(`/api/provider-configs/${draft.id}`, { method: "DELETE" });
      await readApiResponse(response);
      await loadConfigs();
      toast({ tone: "success", title: "配置已删除" });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除配置失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  async function testConnectivity() {
    try {
      setIsTesting(true);
      setError("");
      setConnectivityResult(null);
      const response = await fetch("/api/provider-configs/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildDiagnosticPayload())
      });
      const data = await readApiResponse<ConnectivityResult>(response);
      setConnectivityResult(data);
      toast({ tone: "success", title: "连通性测试通过" });
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "连通性测试失败。");
    } finally {
      setIsTesting(false);
    }
  }

  async function loadModels() {
    try {
      setIsLoadingModels(true);
      setError("");
      setModelsResult(null);
      const response = await fetch("/api/provider-configs/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildDiagnosticPayload())
      });
      const data = await readApiResponse<ModelsResult>(response);
      setModelsResult(data);
      if (!draft.values.model && data.models[0]) {
        updateDraftValues({ model: data.models[0] });
      }
      toast({ tone: "success", title: `已拉取 ${data.count} 个模型` });
    } catch (loadModelsError) {
      setError(loadModelsError instanceof Error ? loadModelsError.message : "拉取模型列表失败。");
    } finally {
      setIsLoadingModels(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="space-y-4 rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Configs</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">AI 配置列表</h2>
            <p className="mt-2 text-sm text-zinc-400">
              为不同供应商维护独立配置，并切换当前使用的那一组。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(createDraft(activeConfig?.provider ?? "openai"))}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            新建配置
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/50 px-5 py-8 text-sm text-zinc-400">
            正在加载配置列表...
          </div>
        ) : configs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/50 px-5 py-8 text-sm text-zinc-400">
            还没有 AI 配置。先在右侧创建一组。
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((item) => (
              <article
                key={item.id}
                className={`rounded-3xl border p-5 transition ${
                  draft.id === item.id
                    ? "border-stone-900 bg-zinc-900/50"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      {item.isActive ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                          当前使用
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      {getProviderLabel(item.provider)} · {item.values.model}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => selectConfig(item)}
                      className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                    >
                      编辑
                    </button>
                    {!item.isActive ? (
                      <button
                        type="button"
                        onClick={() => void activateConfig(item.id)}
                        disabled={isActivating}
                        className="rounded-full btn-primary px-3 py-1.5 text-sm font-medium text-white transition hover:border-transparent disabled:cursor-not-allowed disabled:bg-stone-400"
                      >
                        启用
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Editor</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {draft.id ? "编辑 AI 配置" : "新建 AI 配置"}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">配置名称</label>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如：Gemini 快速版 / Anthropic 精细版"
              className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300">供应商</label>
              <select
                value={draft.provider}
                onChange={(event) => {
                  const nextProvider = event.target.value as AIProviderId;
                  setDraft((current) => ({
                    ...current,
                    provider: nextProvider,
                    hasApiKey: false,
                    values: {
                      ...getDefaultProviderValues(nextProvider),
                      apiKey: "",
                      model:
                        current.provider === nextProvider
                          ? current.values.model
                          : getDefaultModel(nextProvider)
                    }
                  }));
                  setConnectivityResult(null);
                  setModelsResult(null);
                }}
                className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                {PROVIDER_IDS.map((provider) => (
                  <option key={provider} value={provider}>
                    {getProviderLabel(provider)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">模型</label>
              <input
                value={draft.values.model}
                onChange={(event) => updateDraftValues({ model: event.target.value })}
                placeholder={getDefaultModel(draft.provider)}
                className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">API Key</label>
            <input
              type="password"
              value={draft.values.apiKey}
              onChange={(event) => updateDraftValues({ apiKey: event.target.value })}
              placeholder={
                draft.hasApiKey
                  ? "已保存 API Key；留空会继续使用已保存值"
                  : "留空则回退到服务端 .env 默认值"
              }
              className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
            />
          </div>

          {providerSupportsProtocolSelection(draft.provider) ? (
            <div>
              <label className="block text-sm font-medium text-zinc-300">协议</label>
              <select
                value={draft.values.protocol}
                onChange={(event) =>
                  updateDraftValues({
                    protocol: event.target.value as ProviderFormValues["protocol"]
                  })
                }
                className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                {protocolOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "responses"
                      ? "Responses API (/v1/responses)"
                      : "Chat Completions (/v1/chat/completions)"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {providerSupportsApiKeyModeSelection(draft.provider) ? (
            <div>
              <label className="block text-sm font-medium text-zinc-300">API Key 方式</label>
              <select
                value={draft.values.apiKeyMode}
                onChange={(event) =>
                  updateDraftValues({
                    apiKeyMode: event.target.value as ProviderFormValues["apiKeyMode"]
                  })
                }
                className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                <option value="bearer">Authorization: Bearer</option>
                <option value="api_key_header">api-key</option>
                <option value="x_api_key_header">x-api-key</option>
              </select>
            </div>
          ) : null}

          {providerSupportsBaseURL(draft.provider) ? (
            <div>
              <label className="block text-sm font-medium text-zinc-300">Base URL</label>
              <input
                value={draft.values.baseURL}
                onChange={(event) => updateDraftValues({ baseURL: event.target.value })}
                className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              />
            </div>
          ) : null}

          {providerSupportsSiteMetadata(draft.provider) ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Site URL</label>
                <input
                  value={draft.values.siteUrl}
                  onChange={(event) => updateDraftValues({ siteUrl: event.target.value })}
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">App Name</label>
                <input
                  value={draft.values.appName}
                  onChange={(event) => updateDraftValues({ appName: event.target.value })}
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => void testConnectivity()}
              disabled={isTesting || isLoading}
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {isTesting ? "测试中..." : "连通性测试"}
            </button>
            <button
              type="button"
              onClick={() => void loadModels()}
              disabled={isLoadingModels || isLoading}
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-400"
            >
              {isLoadingModels ? "拉取中..." : "拉取模型列表"}
            </button>
          </div>

          {connectivityResult ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-medium">连通性测试通过</p>
              <p className="mt-1">{connectivityResult.message}</p>
              <p className="mt-1 text-xs opacity-80">{connectivityResult.provider} · {connectivityResult.baseURL}</p>
            </div>
          ) : null}

          {modelsResult ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">已拉取 {modelsResult.count} 个模型</p>
              </div>
              <div className="mt-3 max-h-56 space-y-2 overflow-auto">
                {modelsResult.models.slice(0, 30).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => updateDraftValues({ model })}
                    className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      draft.values.model === model
                        ? "border-stone-900 bg-zinc-900/50 text-white"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
              {modelsResult.count > 30 ? (
                <p className="mt-2 text-xs text-zinc-400">仅显示前 30 个模型。</p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={isSaving || isLoading}
              className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSaving ? "保存中..." : draft.id ? "保存修改" : "创建配置"}
            </button>
            {draft.id ? (
              <button
                type="button"
                onClick={() => void activateConfig(draft.id!)}
                disabled={isActivating || activeConfigId === draft.id}
                className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                {activeConfigId === draft.id ? "当前使用中" : isActivating ? "切换中..." : "设为当前配置"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void deleteDraft()}
              disabled={isDeleting || isLoading}
              className="rounded-full border border-red-200 px-5 py-3 text-sm font-medium text-red-700 transition hover:border-red-300 hover:text-red-800 disabled:cursor-not-allowed disabled:text-red-300"
            >
              {draft.id ? (isDeleting ? "删除中..." : "删除配置") : "重置表单"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

