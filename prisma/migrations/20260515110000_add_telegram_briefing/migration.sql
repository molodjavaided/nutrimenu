-- AlterTable User: add Telegram link fields
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- AlterTable Venue: add briefing state
ALTER TABLE "Venue" ADD COLUMN "briefingState" JSONB;
ALTER TABLE "Venue" ADD COLUMN "briefingCompletedAt" TIMESTAMP(3);
