-- CreateTable
CREATE TABLE "ResumeDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    CONSTRAINT "ResumeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ResumeAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "resumeDocumentId" TEXT,
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
    CONSTRAINT "ResumeAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResumeAnalysis_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "ResumeDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ResumeAnalysis" ("createdAt", "fileName", "id", "interviewQuestions", "jobDescription", "matchedKeywords", "missingKeywords", "resumeText", "rewrittenProjects", "rewrittenSummary", "score", "suggestions", "userId") SELECT "createdAt", "fileName", "id", "interviewQuestions", "jobDescription", "matchedKeywords", "missingKeywords", "resumeText", "rewrittenProjects", "rewrittenSummary", "score", "suggestions", "userId" FROM "ResumeAnalysis";
DROP TABLE "ResumeAnalysis";
ALTER TABLE "new_ResumeAnalysis" RENAME TO "ResumeAnalysis";
CREATE INDEX "ResumeAnalysis_userId_createdAt_idx" ON "ResumeAnalysis"("userId", "createdAt");
CREATE INDEX "ResumeAnalysis_resumeDocumentId_idx" ON "ResumeAnalysis"("resumeDocumentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ResumeDocument_userId_createdAt_idx" ON "ResumeDocument"("userId", "createdAt");
