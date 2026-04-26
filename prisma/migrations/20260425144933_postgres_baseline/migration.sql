-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,

    CONSTRAINT "ResumeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeDocumentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "fileName" TEXT,
    "resumeText" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "providerConfigEncrypted" TEXT,
    "errorMessage" TEXT,
    "resultId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "configEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "resumeDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "resumeText" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "score" INTEGER,
    "matchedKeywords" TEXT NOT NULL DEFAULT '[]',
    "missingKeywords" TEXT NOT NULL DEFAULT '[]',
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "rewrittenSummary" TEXT NOT NULL DEFAULT '',
    "rewrittenProjects" TEXT NOT NULL DEFAULT '[]',
    "interviewQuestions" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisKeyword" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AnalysisKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisSuggestion" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AnalysisSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisProject" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AnalysisProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisInterviewQuestion" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AnalysisInterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ResumeDocument_userId_createdAt_idx" ON "ResumeDocument"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisTask_userId_createdAt_idx" ON "AnalysisTask"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisTask_status_createdAt_idx" ON "AnalysisTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderProfile_userId_updatedAt_idx" ON "ProviderProfile"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_userId_provider_key" ON "ProviderProfile"("userId", "provider");

-- CreateIndex
CREATE INDEX "ResumeAnalysis_userId_createdAt_idx" ON "ResumeAnalysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResumeAnalysis_resumeDocumentId_idx" ON "ResumeAnalysis"("resumeDocumentId");

-- CreateIndex
CREATE INDEX "AnalysisKeyword_analysisId_kind_position_idx" ON "AnalysisKeyword"("analysisId", "kind", "position");

-- CreateIndex
CREATE INDEX "AnalysisSuggestion_analysisId_position_idx" ON "AnalysisSuggestion"("analysisId", "position");

-- CreateIndex
CREATE INDEX "AnalysisProject_analysisId_position_idx" ON "AnalysisProject"("analysisId", "position");

-- CreateIndex
CREATE INDEX "AnalysisInterviewQuestion_analysisId_position_idx" ON "AnalysisInterviewQuestion"("analysisId", "position");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeDocument" ADD CONSTRAINT "ResumeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisTask" ADD CONSTRAINT "AnalysisTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisTask" ADD CONSTRAINT "AnalysisTask_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "ResumeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisTask" ADD CONSTRAINT "AnalysisTask_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "ResumeAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "ResumeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisKeyword" ADD CONSTRAINT "AnalysisKeyword_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSuggestion" ADD CONSTRAINT "AnalysisSuggestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisProject" ADD CONSTRAINT "AnalysisProject_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisInterviewQuestion" ADD CONSTRAINT "AnalysisInterviewQuestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
