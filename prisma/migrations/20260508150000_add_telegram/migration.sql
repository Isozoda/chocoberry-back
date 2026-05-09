-- AlterTable: add telegram fields to User
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "telegramLinked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

-- CreateIndex: unique telegramChatId
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateTable: TelegramNotification
CREATE TABLE "TelegramNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TelegramNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramNotification_userId_sentAt_idx" ON "TelegramNotification"("userId", "sentAt");
CREATE INDEX "TelegramNotification_chatId_isRead_idx" ON "TelegramNotification"("chatId", "isRead");

-- AddForeignKey
ALTER TABLE "TelegramNotification" ADD CONSTRAINT "TelegramNotification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
