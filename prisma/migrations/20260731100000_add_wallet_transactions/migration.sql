CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'DEBIT', 'ADJUSTMENT');

CREATE TABLE "wallet_transactions" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reference" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wallet_transactions_businessId_idx" ON "wallet_transactions"("businessId");
CREATE INDEX "wallet_transactions_clientId_idx" ON "wallet_transactions"("clientId");

ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
