-- AlterTable
ALTER TABLE "AnalysisTask" ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingToken" TEXT;
