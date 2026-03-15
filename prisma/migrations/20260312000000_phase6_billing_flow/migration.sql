-- AlterEnum: Add AWAITING_PAYMENT to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterEnum: Add EXPIRED to InvoiceStatus
ALTER TYPE "InvoiceStatus" ADD VALUE 'EXPIRED';

-- AlterTable: Add cloud-init and expiry fields to Order
ALTER TABLE "Order" ADD COLUMN "hostname" TEXT;
ALTER TABLE "Order" ADD COLUMN "rootPassword" TEXT;
ALTER TABLE "Order" ADD COLUMN "sshKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_expiresAt_idx" ON "Order"("expiresAt");
