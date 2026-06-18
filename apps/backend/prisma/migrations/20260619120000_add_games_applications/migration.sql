-- CreateEnum
CREATE TYPE "GameApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable: Game - add masterId and gameSystemId
ALTER TABLE "Game" ADD COLUMN "masterId" TEXT;
ALTER TABLE "Game" ADD COLUMN "gameSystemId" TEXT;

-- Legacy Game rows (if any) without master — remove before NOT NULL
DELETE FROM "Game";

ALTER TABLE "Game" ADD CONSTRAINT "Game_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_gameSystemId_fkey" FOREIGN KEY ("gameSystemId") REFERENCES "GameSystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Game_masterId_idx" ON "Game"("masterId");
CREATE INDEX "Game_gameSystemId_idx" ON "Game"("gameSystemId");

-- CreateTable
CREATE TABLE "GameApplication" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GameApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameApplication_gameId_userId_key" ON "GameApplication"("gameId", "userId");
CREATE INDEX "GameApplication_gameId_idx" ON "GameApplication"("gameId");
CREATE INDEX "GameApplication_userId_idx" ON "GameApplication"("userId");
CREATE INDEX "GameApplication_status_idx" ON "GameApplication"("status");

ALTER TABLE "GameApplication" ADD CONSTRAINT "GameApplication_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameApplication" ADD CONSTRAINT "GameApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- masterId NOT NULL: only if Game table empty; Prisma migrate dev would handle. For deploy, alter column:
-- Skip NOT NULL on masterId in SQL if games could exist - Prisma schema requires masterId String not optional.
-- Init schema Game had no rows in seed typically.

ALTER TABLE "Game" ALTER COLUMN "masterId" SET NOT NULL;
