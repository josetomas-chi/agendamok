-- AlterEnum
ALTER TYPE "TournamentFormat" ADD VALUE 'GROUP_STAGE';

-- AlterTable
ALTER TABLE "tournament_matches" ADD COLUMN     "group" TEXT,
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'KNOCKOUT';

-- AlterTable
ALTER TABLE "tournament_participants" ADD COLUMN     "group" TEXT;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "advanceCount" INTEGER,
ADD COLUMN     "groupCount" INTEGER;
