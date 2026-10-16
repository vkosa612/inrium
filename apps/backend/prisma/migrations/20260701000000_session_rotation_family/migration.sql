-- Refresh token rotation + reuse detection.
-- Additive зміна: існуючі сесії отримують familyId = id (кожна — своя «сім'я»).

ALTER TABLE "Session" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Session" ADD COLUMN "rotatedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "replacedById" TEXT;

UPDATE "Session" SET "familyId" = "id" WHERE "familyId" IS NULL;

ALTER TABLE "Session" ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX "Session_familyId_idx" ON "Session"("familyId");
