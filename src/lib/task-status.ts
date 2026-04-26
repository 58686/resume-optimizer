export type AnalysisTaskStatus = "queued" | "processing" | "succeeded" | "failed";

export function getTaskStatusMeta(status: AnalysisTaskStatus) {
  switch (status) {
    case "processing":
      return {
        label: "分析中",
        description: "AI 正在处理简历与岗位描述，通常会在几十秒内完成。",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        accentClass: "bg-amber-500",
        dotClass: "bg-amber-500",
        panelClass: "border-amber-200 bg-amber-50 text-amber-900"
      };
    case "succeeded":
      return {
        label: "已完成",
        description: "分析结果已经生成，可以直接查看完整报告。",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        accentClass: "bg-emerald-500",
        dotClass: "bg-emerald-500",
        panelClass: "border-emerald-200 bg-emerald-50 text-emerald-900"
      };
    case "failed":
      return {
        label: "失败",
        description: "任务执行失败，请检查模型配置或稍后重试。",
        badgeClass: "border-red-200 bg-red-50 text-red-700",
        accentClass: "bg-red-500",
        dotClass: "bg-red-500",
        panelClass: "border-red-200 bg-red-50 text-red-900"
      };
    case "queued":
    default:
      return {
        label: "排队中",
        description: "任务已经创建，正在等待可用的分析资源。",
        badgeClass: "border-zinc-800 bg-zinc-800 text-zinc-300",
        accentClass: "bg-stone-400",
        dotClass: "bg-stone-400",
        panelClass: "border-zinc-800 bg-zinc-900/50 text-white"
      };
  }
}

export function getTaskStatusText(status: AnalysisTaskStatus) {
  return getTaskStatusMeta(status).label;
}
