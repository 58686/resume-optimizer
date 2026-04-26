import { UploadForm } from "@/components/upload-form";
import { requireCurrentUser } from "@/lib/auth";

const uploadChecklist = [
  {
    title: "先上传简历",
    description: "支持 PDF、DOCX、TXT、MD，单文件不超过 5MB。"
  },
  {
    title: "补全职位描述",
    description: "尽量包含职责、关键词、技术栈和经验要求。"
  },
  {
    title: "选择 AI 配置",
    description: "从已保存的模型配置里选一组作为本次分析引擎。"
  }
];

export default async function UploadPage() {
  await requireCurrentUser();

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="animate-slide-up rounded-[2rem] glass-panel p-8 shadow-glow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gradient-start/10 rounded-full blur-[80px] pointer-events-none" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Upload</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h1 className="text-4xl font-extrabold text-white">
                上传简历并<span className="text-brand-gradient">开始分析</span>
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                当前流程分成三步：上传简历、填写岗位信息、选择一组已保存的 AI 配置。配置维护已独立到单独模块。
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/50 p-5 relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Quick Checklist</p>
              <div className="mt-4 space-y-4">
                {uploadChecklist.map((item, index) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-gradient-start to-brand-gradient-end text-xs font-bold text-white shadow-glow-sm">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="animate-slide-up delay-1 rounded-[2rem] glass-panel p-8 shadow-glow-lg">
          <UploadForm />
        </div>
      </section>
    </main>
  );
}
