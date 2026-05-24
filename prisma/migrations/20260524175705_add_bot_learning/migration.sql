-- CreateTable
CREATE TABLE "BotConversationLog" (
    "id" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "botResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotConversationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotKnowledge" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotConversationLog_createdAt_idx" ON "BotConversationLog"("createdAt");
