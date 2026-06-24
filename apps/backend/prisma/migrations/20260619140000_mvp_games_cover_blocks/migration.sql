-- AlterEnum
ALTER TYPE "HomePageBlockType" ADD VALUE 'GAMES';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "coverImageUrl" TEXT;
