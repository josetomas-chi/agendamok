-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'EMITTED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "InvoiceDocType" AS ENUM ('BOLETA', 'FACTURA');

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPlan_new" AS ENUM ('STARTER', 'NEGOCIO', 'PRO');
ALTER TABLE "public"."subscriptions" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "plan" TYPE "SubscriptionPlan_new" USING ("plan"::text::"SubscriptionPlan_new");
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
ALTER TYPE "SubscriptionPlan_new" RENAME TO "SubscriptionPlan";
DROP TYPE "public"."SubscriptionPlan_old";
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'STARTER';
COMMIT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "bsaleApiKey" TEXT,
ADD COLUMN "bsaleAutoInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bsaleDocType" "InvoiceDocType" NOT NULL DEFAULT 'BOLETA';

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "bsaleId" INTEGER,
    "docType" "InvoiceDocType" NOT NULL DEFAULT 'BOLETA',
    "number" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "clientName" TEXT,
    "clientRut" TEXT,
    "clientEmail" TEXT,
    "pdfUrl" TEXT,
    "xmlUrl" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "emittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paymentId_key" ON "invoices"("paymentId");

-- CreateIndex
CREATE INDEX "invoices_businessId_idx" ON "invoices"("businessId");

-- CreateIndex
CREATE INDEX "invoices_businessId_status_idx" ON "invoices"("businessId", "status");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
