-- Make appointmentId optional and add courtBookingId to payments
ALTER TABLE "payments" ALTER COLUMN "appointmentId" DROP NOT NULL;
ALTER TABLE "payments" ADD COLUMN "courtBookingId" TEXT;
ALTER TABLE "payments" ADD CONSTRAINT "payments_courtBookingId_key" UNIQUE ("courtBookingId");
ALTER TABLE "payments" ADD CONSTRAINT "payments_courtBookingId_fkey" FOREIGN KEY ("courtBookingId") REFERENCES "court_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
