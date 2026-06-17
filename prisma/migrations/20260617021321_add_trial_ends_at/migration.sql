/*
  Warnings:

  - A unique constraint covering the columns `[flowCustomerId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[flowSubscriptionId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "flowCustomerId" TEXT,
ADD COLUMN     "flowSubscriptionId" TEXT,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_flowCustomerId_key" ON "subscriptions"("flowCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_flowSubscriptionId_key" ON "subscriptions"("flowSubscriptionId");
