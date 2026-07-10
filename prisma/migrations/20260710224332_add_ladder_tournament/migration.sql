-- AlterEnum
ALTER TYPE "TournamentFormat" ADD VALUE 'LADDER';

-- AlterTable
ALTER TABLE "tournament_participants" ADD COLUMN     "ladderPosition" INTEGER;
