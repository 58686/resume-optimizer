import Link from "next/link";
import { InterviewPrepPanel } from "@/components/interview-prep-panel";
import { mapInterviewPrepSession, interviewPrepSessionSelect } from "@/lib/interview-prep-record";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listUserProviderConfigs } from "@/lib/provider-configs";
import type { InterviewPrepQuestion } from "@/types/analysis";

export default async function InterviewPrepPage({
  searchParams
}: {
  searchParams?: Promise<{ from?: string; session?: string }>;
}) {
  const user = await requireCurrentUser();
  const { configs } = await listUserProviderConfigs(user.id);
  const params = searchParams ? await searchParams : {};

  const providerConfigOptions = configs.map((config) => ({
    id: config.id,
    name: config.name
  }));

  let initialResumeText: string | undefined;
  let initialJobDescription: string | undefined;
  let fromFileName: string | null = null;
  let initialAnalysisId: string | undefined;
  let initialSessionId: string | undefined;
  let initialQuestions: InterviewPrepQuestion[] | undefined;

  if (params.from) {
    const result = await prisma.resumeAnalysis.findFirst({
      where: { id: params.from, userId: user.id },
      select: { resumeText: true, jobDescription: true, fileName: true }
    });
    if (result) {
      initialResumeText = result.resumeText;
      initialJobDescription = result.jobDescription;
      fromFileName = result.fileName;
      initialAnalysisId = params.from;
    }
  }

  const rawSession = params.session
    ? await prisma.interviewPrepSession.findFirst({
        where: {
          id: params.session,
          userId: user.id
        },
        select: interviewPrepSessionSelect
      })
    : params.from
      ? await prisma.interviewPrepSession.findFirst({
          where: {
            analysisId: params.from,
            userId: user.id
          },
          select: interviewPrepSessionSelect
        })
      : null;

  if (rawSession) {
    const session = mapInterviewPrepSession(rawSession);
    initialSessionId = session.id;
    initialQuestions = session.questions;
    initialResumeText = session.resumeText;
    initialJobDescription = session.jobDescription;
    fromFileName = session.sourceFileName ?? fromFileName;
    initialAnalysisId = session.analysisId ?? initialAnalysisId;
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[0_30px_80px_rgba(120,94,46,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">
                Interview Preparation
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-white">
                面试题生成器
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                基于简历和目标岗位，AI 为你量身生成分类面试题，涵盖技术基础、项目经验、行为面试等维度，支持多格式导出。
              </p>
              {fromFileName && (
                <p className="mt-2 text-xs text-zinc-500">
                  已自动填入来自「{fromFileName}」的简历和职位描述
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                新建分析
              </Link>
              <Link
                href="/tasks"
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                返回任务列表
              </Link>
            </div>
          </div>
        </div>

        <InterviewPrepPanel
          providerConfigs={providerConfigOptions}
          initialResumeText={initialResumeText}
          initialJobDescription={initialJobDescription}
          initialQuestions={initialQuestions}
          initialAnalysisId={initialAnalysisId}
          initialSessionId={initialSessionId}
        />
      </section>
    </main>
  );
}
