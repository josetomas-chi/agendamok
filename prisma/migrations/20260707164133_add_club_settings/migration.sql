-- CreateTable
CREATE TABLE "club_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clubName" TEXT,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "openDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6]::INTEGER[],
    "openTime" TEXT NOT NULL DEFAULT '08:00',
    "closeTime" TEXT NOT NULL DEFAULT '22:00',
    "slotMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_settings_businessId_key" ON "club_settings"("businessId");

-- AddForeignKey
ALTER TABLE "club_settings" ADD CONSTRAINT "club_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
