ALTER TABLE "businesses" ADD COLUMN "cancellationHoursNotice" INTEGER;
ALTER TABLE "businesses" ADD COLUMN "coverImage" TEXT;
ALTER TABLE "businesses" ADD COLUMN "primaryColor" TEXT;
ALTER TABLE "businesses" ADD COLUMN "dailySummaryEnabled" BOOLEAN NOT NULL DEFAULT false;
