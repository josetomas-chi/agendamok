-- AlterTable
ALTER TABLE "court_bookings" ADD COLUMN     "recurringGroupId" TEXT;

-- CreateTable
CREATE TABLE "recurring_booking_groups" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "clientId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startHour" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "rangeStart" DATE NOT NULL,
    "rangeEnd" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_booking_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_booking_groups_businessId_idx" ON "recurring_booking_groups"("businessId");

-- CreateIndex
CREATE INDEX "court_bookings_recurringGroupId_idx" ON "court_bookings"("recurringGroupId");

-- AddForeignKey
ALTER TABLE "recurring_booking_groups" ADD CONSTRAINT "recurring_booking_groups_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_booking_groups" ADD CONSTRAINT "recurring_booking_groups_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_booking_groups" ADD CONSTRAINT "recurring_booking_groups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_recurringGroupId_fkey" FOREIGN KEY ("recurringGroupId") REFERENCES "recurring_booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
