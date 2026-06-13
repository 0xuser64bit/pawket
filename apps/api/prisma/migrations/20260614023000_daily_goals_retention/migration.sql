ALTER TYPE "PassportEventType" ADD VALUE 'daily_reward';

CREATE TABLE "PetDailyReward" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "bonusXp" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetDailyReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PetDailyReward_petId_date_key" ON "PetDailyReward"("petId", "date");

CREATE INDEX "PetDailyReward_petId_date_idx" ON "PetDailyReward"("petId", "date");

ALTER TABLE "PetDailyReward" ADD CONSTRAINT "PetDailyReward_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
