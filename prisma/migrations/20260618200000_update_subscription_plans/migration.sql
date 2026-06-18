-- Update SubscriptionPlan enum: FREE/PRO/ENTERPRISE → STARTER/NEGOCIO/PRO
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'NEGOCIO', 'PRO');
ALTER TABLE "subscriptions"
  ALTER COLUMN "plan" DROP DEFAULT,
  ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING (
    CASE "plan"::text
      WHEN 'FREE'       THEN 'STARTER'
      WHEN 'PRO'        THEN 'NEGOCIO'
      WHEN 'ENTERPRISE' THEN 'PRO'
      ELSE 'STARTER'
    END
  )::"SubscriptionPlan",
  ALTER COLUMN "plan" SET DEFAULT 'STARTER';
DROP TYPE "SubscriptionPlan_old";
