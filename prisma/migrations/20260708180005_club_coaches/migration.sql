-- AlterTable
ALTER TABLE "court_bookings" ADD COLUMN     "coachId" TEXT;

-- CreateTable
CREATE TABLE "club_coaches" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photo" TEXT,
    "color" TEXT NOT NULL DEFAULT '#38bdf8',
    "paymentType" TEXT NOT NULL DEFAULT 'COMMISSION',
    "commissionPercent" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_coaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_coach_fee_rules" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "days" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "club_coach_fee_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_coaches_businessId_idx" ON "club_coaches"("businessId");

-- CreateIndex
CREATE INDEX "club_coach_fee_rules_coachId_idx" ON "club_coach_fee_rules"("coachId");

-- CreateIndex
CREATE INDEX "court_bookings_coachId_idx" ON "court_bookings"("coachId");

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "club_coaches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_coaches" ADD CONSTRAINT "club_coaches_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_coach_fee_rules" ADD CONSTRAINT "club_coach_fee_rules_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "club_coaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
