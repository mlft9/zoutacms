-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceStatus" ADD VALUE 'PROVISIONING';
ALTER TYPE "ServiceStatus" ADD VALUE 'PROVISIONING_FAILED';
ALTER TYPE "ServiceStatus" ADD VALUE 'PROVISIONING_TIMEOUT';
ALTER TYPE "ServiceStatus" ADD VALUE 'REQUIRES_MANUAL_CHECK';
ALTER TYPE "ServiceStatus" ADD VALUE 'TERMINATING';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "nextRetryAt" TIMESTAMP(3),
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "provisionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "provisionError" TEXT;

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderConfig_provider_idx" ON "ProviderConfig"("provider");

-- CreateIndex
CREATE INDEX "ProviderConfig_isActive_idx" ON "ProviderConfig"("isActive");

-- CreateIndex
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
