import { ProviderConfigManager } from "@/components/provider-config-manager";
import { requireCurrentUser } from "@/lib/auth";

export default async function ProvidersPage() {
  await requireCurrentUser();

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-zinc-800 glass-panel p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Providers</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">AI 配置模块</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            在这里集中管理 OpenAI、Gemini、Anthropic、NVIDIA 等配置，并切换当前上传页默认使用的那一组。
          </p>
        </div>

        <ProviderConfigManager />
      </section>
    </main>
  );
}
