-- prisma-migrate-no-transaction
-- Update SubscriptionPlan enum: FREE/PRO/ENTERPRISE → STARTER/NEGOCIO/PRO

-- Add new values
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'NEGOCIO';

-- Migrate existing data
UPDATE "subscriptions" SET "plan" = 'STARTER' WHERE "plan" = 'FREE';
UPDATE "subscriptions" SET "plan" = 'NEGOCIO' WHERE "plan" = 'PRO';
UPDATE "subscriptions" SET "plan" = 'PRO'     WHERE "plan" = 'ENTERPRISE';

-- Change default
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'STARTER';
