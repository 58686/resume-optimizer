-- CreateTable
CREATE TABLE "AnalysisKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisKeyword_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisSuggestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisProject_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisInterviewQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "AnalysisInterviewQuestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalysisKeyword_analysisId_kind_position_idx" ON "AnalysisKeyword"("analysisId", "kind", "position");

-- CreateIndex
CREATE INDEX "AnalysisSuggestion_analysisId_position_idx" ON "AnalysisSuggestion"("analysisId", "position");

-- CreateIndex
CREATE INDEX "AnalysisProject_analysisId_position_idx" ON "AnalysisProject"("analysisId", "position");

-- CreateIndex
CREATE INDEX "AnalysisInterviewQuestion_analysisId_position_idx" ON "AnalysisInterviewQuestion"("analysisId", "position");
