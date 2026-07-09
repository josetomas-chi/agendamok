-- CreateTable
CREATE TABLE "tournament_schedule_days" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_schedule_days_tournamentId_idx" ON "tournament_schedule_days"("tournamentId");

-- AddForeignKey
ALTER TABLE "tournament_schedule_days" ADD CONSTRAINT "tournament_schedule_days_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
