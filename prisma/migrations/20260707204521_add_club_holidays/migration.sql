-- CreateTable
CREATE TABLE "club_holidays" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CLOSED',
    "surchargeType" TEXT,
    "surchargeValue" DOUBLE PRECISION,

    CONSTRAINT "club_holidays_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "club_holidays" ADD CONSTRAINT "club_holidays_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
