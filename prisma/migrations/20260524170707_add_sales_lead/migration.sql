-- CreateTable
CREATE TABLE "SalesLead" (
    "id" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "telegramName" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "intent" TEXT,
    "reasoning" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesLead_telegramChatId_key" ON "SalesLead"("telegramChatId");

-- CreateIndex
CREATE INDEX "SalesLead_intent_idx" ON "SalesLead"("intent");

-- CreateIndex
CREATE INDEX "SalesLead_createdAt_idx" ON "SalesLead"("createdAt");
