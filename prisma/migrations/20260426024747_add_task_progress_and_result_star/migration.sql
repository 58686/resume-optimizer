-- AlterTable
ALTER TABLE "AnalysisTask" ADD COLUMN     "progressMessage" TEXT,
ADD COLUMN     "progressStage" TEXT;

-- AlterTable
ALTER TABLE "ResumeAnalysis" ADD COLUMN     "starred" BOOLEAN NOT NULL DEFAULT false;
