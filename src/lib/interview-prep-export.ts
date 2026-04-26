import type { InterviewPrepQuestion } from "@/types/analysis";
import { categoryLabels, difficultyLabels } from "@/types/analysis";

type CategoryKey = InterviewPrepQuestion["category"];

function groupByCategory(questions: InterviewPrepQuestion[]) {
  const groups = new Map<CategoryKey, InterviewPrepQuestion[]>();
  for (const q of questions) {
    const list = groups.get(q.category) ?? [];
    list.push(q);
    groups.set(q.category, list);
  }
  return groups;
}

export function exportInterviewPrepMarkdown(
  questions: InterviewPrepQuestion[],
  fileName?: string
) {
  const groups = groupByCategory(questions);
  const lines: string[] = [
    "# 面试题准备",
    "",
    `> 共 ${questions.length} 道题目`,
    ""
  ];

  for (const [category, items] of groups) {
    lines.push(`## ${categoryLabels[category]}`);
    lines.push("");

    items.forEach((q, idx) => {
      lines.push(`### ${idx + 1}. ${q.question}`);
      lines.push("");
      lines.push(`**难度**：${difficultyLabels[q.difficulty]}`);
      lines.push("");
      lines.push("**参考答案**：");
      lines.push("");
      lines.push(q.sampleAnswer);
      lines.push("");
      lines.push("**回答要点**：");
      lines.push("");
      q.keyPoints.forEach((point) => {
        lines.push(`- ${point}`);
      });
      lines.push("");
      lines.push("---");
      lines.push("");
    });
  }

  const markdown = lines.join("\n");

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(fileName || "interview-prep").replace(/\.[^.]+$/, "")}-interview.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportInterviewPrepPdf() {
  window.print();
}

export function exportInterviewPrepDocx(
  questions: InterviewPrepQuestion[],
  fileName?: string
) {
  const groups = groupByCategory(questions);

  const htmlParts: string[] = [
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`,
    `<head><meta charset="utf-8"><title>面试题准备</title>`,
    `<style>`,
    `body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; }`,
    `h1 { font-size: 22pt; color: #1a1a1a; border-bottom: 2px solid #d6a96d; padding-bottom: 8px; }`,
    `h2 { font-size: 16pt; color: #2d2319; margin-top: 24pt; }`,
    `h3 { font-size: 13pt; color: #1a1a1a; margin-top: 16pt; }`,
    `.difficulty { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10pt; font-weight: 600; }`,
    `.basic { background: #dcfce7; color: #166534; }`,
    `.intermediate { background: #fef3c7; color: #92400e; }`,
    `.advanced { background: #fecaca; color: #991b1b; }`,
    `.key-point { margin: 4pt 0; padding-left: 12pt; }`,
    `.separator { border: none; border-top: 1px solid #e5e5e5; margin: 16pt 0; }`,
    `</style></head><body>`
  ];

  htmlParts.push(`<h1>面试题准备</h1>`);
  htmlParts.push(`<p>共 ${questions.length} 道题目</p>`);

  for (const [category, items] of groups) {
    htmlParts.push(`<h2>${categoryLabels[category]}</h2>`);

    items.forEach((q, idx) => {
      htmlParts.push(`<h3>${idx + 1}. ${q.question}</h3>`);
      htmlParts.push(`<p><span class="difficulty ${q.difficulty}">${difficultyLabels[q.difficulty]}</span></p>`);
      htmlParts.push(`<p><strong>参考答案：</strong></p>`);
      htmlParts.push(`<p>${q.sampleAnswer.replace(/\n/g, "<br/>")}</p>`);
      htmlParts.push(`<p><strong>回答要点：</strong></p>`);
      htmlParts.push(`<ul>`);
      q.keyPoints.forEach((point) => {
        htmlParts.push(`<li class="key-point">${point}</li>`);
      });
      htmlParts.push(`</ul>`);
      htmlParts.push(`<hr class="separator" />`);
    });
  }

  htmlParts.push(`</body></html>`);

  const html = htmlParts.join("\n");
  const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(fileName || "interview-prep").replace(/\.[^.]+$/, "")}-interview.doc`;
  anchor.click();
  URL.revokeObjectURL(url);
}
