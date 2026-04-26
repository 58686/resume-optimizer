"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { readApiResponse } from "@/lib/api-client";
import type { AIProviderId } from "@/lib/ai/types";
import {
  PROVIDER_IDS,
  createDefaultProviderValuesMap,
  getDefaultModel,
  getProviderLabel,
  getSupportedProtocols,
  providerSupportsApiKeyModeSelection,
  providerSupportsBaseURL,
  providerSupportsProtocolSelection,
  providerSupportsSiteMetadata,
  type ProviderFormValues
} from "@/lib/provider-settings";

type TaskEditFormProps = {
  initialTask: {
    id: string;
    fileName: string | null;
    status: "queued" | "processing" | "succeeded" | "failed";
    resumeText: string;
    jobDescription: string;
    provider: AIProviderId;
    providerValues: ProviderFormValues;
  };
};

export function TaskEditForm({ initialTask }: TaskEditFormProps) {
  const router = useRouter();
  const [resumeText, setResumeText] = useState(initialTask.resumeText);
  const [jobDescription, setJobDescription] = useState(initialTask.jobDescription);
  const [provider, setProvider] = useState<AIProviderId>(initialTask.provider);
  const [providerValuesMap, setProviderValuesMap] = useState(() => ({
    ...createDefaultProviderValuesMap(),
    [initialTask.provider]: initialTask.providerValues
  }));
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const currentValues = useMemo(() => providerValuesMap[provider], [provider, providerValuesMap]);
  const protocolOptions = getSupportedProtocols(provider);

  function updateProviderValues(nextValues: Partial<ProviderFormValues>) {
    setProviderValuesMap((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        ...nextValues
      }
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch(`/api/tasks/${initialTask.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          provider,
          protocol: currentValues.protocol,
          apiKeyMode: currentValues.apiKeyMode,
          apiKey: currentValues.apiKey,
          model: currentValues.model,
          baseURL: currentValues.baseURL,
          siteUrl: currentValues.siteUrl,
          appName: currentValues.appName
        })
      });

      const data = await readApiResponse<{ taskId: string; status: string }>(response);
      router.push(`/tasks/${data.taskId}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存任务修改失败。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Task Edit</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">编辑任务并重新分析</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              保存后会复用当前任务 ID 重新排队执行。旧结果仍保留在历史记录里。
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
            文件：{initialTask.fileName || "未命名文件"}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-sm">
            <label className="block text-sm font-medium text-zinc-300">简历文本</label>
            <textarea
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              rows={16}
              className="mt-3 w-full rounded-3xl border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm leading-6 text-zinc-300 outline-none transition focus:border-zinc-500"
            />
          </div>

          <div className="rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-sm">
            <label className="block text-sm font-medium text-zinc-300">岗位描述</label>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              rows={14}
              className="mt-3 w-full rounded-3xl border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm leading-6 text-zinc-300 outline-none transition focus:border-zinc-500"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-300">AI 配置</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300">供应商</label>
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as AIProviderId)}
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                >
                  {PROVIDER_IDS.map((item) => (
                    <option key={item} value={item}>
                      {getProviderLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">模型</label>
                <input
                  value={currentValues.model}
                  onChange={(event) => updateProviderValues({ model: event.target.value })}
                  placeholder={getDefaultModel(provider)}
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowApiKey((value) => !value)}
                className="text-sm text-zinc-400"
              >
                {showApiKey ? "隐藏 API Key" : "显示 API Key"}
              </button>

              <div>
                <label className="block text-sm font-medium text-zinc-300">API Key</label>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={currentValues.apiKey}
                  onChange={(event) => updateProviderValues({ apiKey: event.target.value })}
                  placeholder="可留空，继续使用当前任务快照、账号配置或服务端默认配置"
                  className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                />
              </div>

              {providerSupportsProtocolSelection(provider) ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-300">协议</label>
                  <select
                    value={currentValues.protocol}
                    onChange={(event) =>
                      updateProviderValues({
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

              {providerSupportsApiKeyModeSelection(provider) ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-300">API Key 方式</label>
                  <select
                    value={currentValues.apiKeyMode}
                    onChange={(event) =>
                      updateProviderValues({
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

              {providerSupportsBaseURL(provider) ? (
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Base URL</label>
                  <input
                    value={currentValues.baseURL}
                    onChange={(event) => updateProviderValues({ baseURL: event.target.value })}
                    className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                  />
                </div>
              ) : null}

              {providerSupportsSiteMetadata(provider) ? (
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300">Site URL</label>
                    <input
                      value={currentValues.siteUrl}
                      onChange={(event) => updateProviderValues({ siteUrl: event.target.value })}
                      className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300">App Name</label>
                    <input
                      value={currentValues.appName}
                      onChange={(event) => updateProviderValues({ appName: event.target.value })}
                      className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSaving ? "保存中..." : "保存并重新分析"}
            </button>
            <Link
              href={`/tasks/${initialTask.id}`}
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              返回任务详情
            </Link>
          </div>
        </div>
      </section>
    </form>
  );
}
