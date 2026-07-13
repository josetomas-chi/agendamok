-- AlterTable
ALTER TABLE "court_pricing_rules" ADD COLUMN     "fixedSlots" TEXT[] DEFAULT ARRAY[]::TEXT[];
