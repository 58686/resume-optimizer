"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { ResultInteractions } from "@/components/result-interactions";
import { ResumeEditorPanel } from "@/components/resume-editor-panel";
import { ScoreTrendChart } from "@/components/score-trend-chart";

type KeywordAction = {
  term: string;
  mode: "search" | "inject";
  nonce: number;
} | null;

export function ResultWorkspace({
  analysisId,
  fileName,
  score,
  createdAt,
  resumeText,
  jobDescription,
  analysis,
  trendPoints
}: {
  analysisId: string;
  fileName: string | null;
  score: number | null;
  createdAt: string;
  resumeText: string;
  jobDescription: string;
  analysis: AnalysisResult;
  trendPoints: Array<{ label: string; score: number | null }>;
}) {
  const [keywordAction, setKeywordAction] = useState<KeywordAction>(null);

  function pushAction(term: string, mode: "search" | "inject") {
    setKeywordAction({
      term,
      mode,
      nonce: Date.now()
    });
  }

  return (
    <div className="space-y-6">
      <ResultInteractions
        analysisId={analysisId}
        fileName={fileName}
        score={score}
        createdAt={createdAt}
        analysis={analysis}
        onSearchKeyword={(keyword) => pushAction(keyword, "search")}
        onInjectKeyword={(keyword) => pushAction(keyword, "inject")}
      />
      <ResumeEditorPanel
        analysisId={analysisId}
        initialResumeText={resumeText}
        initialJobDescription={jobDescription}
        pendingAction={keywordAction}
      />
      <ScoreTrendChart points={trendPoints} />
    </div>
  );
}
