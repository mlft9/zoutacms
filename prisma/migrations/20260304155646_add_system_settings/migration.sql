-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL DEFAULT 'ZoutaCMS',
    "platformUrl" TEXT,
    "isSetupComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
