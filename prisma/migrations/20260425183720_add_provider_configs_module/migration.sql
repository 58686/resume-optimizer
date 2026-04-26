-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeProviderConfigId" TEXT;

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "configEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderConfig_userId_updatedAt_idx" ON "ProviderConfig"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_userId_name_key" ON "ProviderConfig"("userId", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeProviderConfigId_fkey" FOREIGN KEY ("activeProviderConfigId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
