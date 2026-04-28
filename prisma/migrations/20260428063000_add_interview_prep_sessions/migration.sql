-- CreateTable
CREATE TABLE "InterviewPrepSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "sourceFileName" TEXT,
    "resumeText" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "questions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewPrepSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewPrepSession_analysisId_key" ON "InterviewPrepSession"("analysisId");

-- CreateIndex
CREATE INDEX "InterviewPrepSession_userId_createdAt_idx" ON "InterviewPrepSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "InterviewPrepSession" ADD CONSTRAINT "InterviewPrepSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPrepSession" ADD CONSTRAINT "InterviewPrepSession_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
