-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResumeAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
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
    "interviewQuestions" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "ResumeAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ResumeAnalysis" ("createdAt", "fileName", "id", "interviewQuestions", "jobDescription", "matchedKeywords", "missingKeywords", "resumeText", "rewrittenProjects", "rewrittenSummary", "score", "suggestions") SELECT "createdAt", "fileName", "id", "interviewQuestions", "jobDescription", "matchedKeywords", "missingKeywords", "resumeText", "rewrittenProjects", "rewrittenSummary", "score", "suggestions" FROM "ResumeAnalysis";
DROP TABLE "ResumeAnalysis";
ALTER TABLE "new_ResumeAnalysis" RENAME TO "ResumeAnalysis";
CREATE INDEX "ResumeAnalysis_userId_createdAt_idx" ON "ResumeAnalysis"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
