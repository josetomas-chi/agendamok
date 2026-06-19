-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "cancelToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_cancelToken_key" ON "appointments"("cancelToken");
