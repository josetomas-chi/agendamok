-- AlterTable
ALTER TABLE "tournament_matches" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "tournament_participants" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "tournament_categories" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_categories_tournamentId_idx" ON "tournament_categories"("tournamentId");

-- AddForeignKey
ALTER TABLE "tournament_categories" ADD CONSTRAINT "tournament_categories_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tournament_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tournament_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
