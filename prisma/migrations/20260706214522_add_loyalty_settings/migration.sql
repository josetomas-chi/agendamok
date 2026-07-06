-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "loyaltyPointsPerVisit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "loyaltyVipThreshold" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "segmentDiscounts" JSONB NOT NULL DEFAULT '{}';
