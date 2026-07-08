-- AlterTable
ALTER TABLE "club_coach_fee_rules" ADD COLUMN     "classPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "price" SET DEFAULT 0;
