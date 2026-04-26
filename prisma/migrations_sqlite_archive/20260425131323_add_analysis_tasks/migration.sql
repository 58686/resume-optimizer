-- CreateTable
CREATE TABLE "AnalysisTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "resumeDocumentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "fileName" TEXT,
    "resumeText" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "errorMessage" TEXT,
    "resultId" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnalysisTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalysisTask_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "ResumeDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalysisTask_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ResumeAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalysisTask_userId_createdAt_idx" ON "AnalysisTask"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisTask_status_createdAt_idx" ON "AnalysisTask"("status", "createdAt");
