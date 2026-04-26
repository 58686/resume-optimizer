-- CreateTable
CREATE TABLE "ResumeAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT,
    "resumeText" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL,
    "score" INTEGER,
    "matchedKeywords" TEXT NOT NULL DEFAULT '[]',
    "missingKeywords" TEXT NOT NULL DEFAULT '[]',
    "suggestions" TEXT NOT NULL DEFAULT '[]',
    "rewrittenSummary" TEXT NOT NULL DEFAULT '',
    "rewrittenProjects" TEXT NOT NULL DEFAULT '[]',
    "interviewQuestions" TEXT NOT NULL DEFAULT '[]'
);
