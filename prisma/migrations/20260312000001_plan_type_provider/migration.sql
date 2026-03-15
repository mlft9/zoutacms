-- Add type and providerId to Plan
ALTER TABLE "Plan" ADD COLUMN "type" "ServiceType" NOT NULL DEFAULT 'VPS';
ALTER TABLE "Plan" ADD COLUMN "providerId" TEXT;

-- Migrate existing data: copy type/providerId from Product to its Plans
UPDATE "Plan" SET "type" = p.type, "providerId" = p."providerId"
FROM "Product" p WHERE "Plan"."productId" = p.id;

-- Add FK constraint for Plan.providerId
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Plan_type_idx" ON "Plan"("type");
CREATE INDEX "Plan_providerId_idx" ON "Plan"("providerId");

-- Remove type and providerId from Product
ALTER TABLE "Product" DROP COLUMN "type";
ALTER TABLE "Product" DROP COLUMN "providerId";
