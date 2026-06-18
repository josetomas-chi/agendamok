-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "clinicalRecordEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "bloodType" TEXT,
    "allergies" TEXT,
    "conditions" TEXT,
    "medications" TEXT,
    "background" TEXT,
    "notes" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_entries" (
    "id" TEXT NOT NULL,
    "clinicalRecordId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "staffName" TEXT,
    "notes" TEXT NOT NULL,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinical_records_clientId_key" ON "clinical_records"("clientId");

-- CreateIndex
CREATE INDEX "clinical_records_businessId_idx" ON "clinical_records"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_entries_appointmentId_key" ON "clinical_entries"("appointmentId");

-- CreateIndex
CREATE INDEX "clinical_entries_clinicalRecordId_idx" ON "clinical_entries"("clinicalRecordId");

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_entries" ADD CONSTRAINT "clinical_entries_clinicalRecordId_fkey" FOREIGN KEY ("clinicalRecordId") REFERENCES "clinical_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
