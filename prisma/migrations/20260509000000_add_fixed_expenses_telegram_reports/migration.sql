-- CreateTable
CREATE TABLE "FixedExpense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TJS',
    "period" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramDailyReport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL,
    "closingBalance" DECIMAL(12,2) NOT NULL,
    "totalExpenses" DECIMAL(12,2) NOT NULL,
    "rawText" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'telegram',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramDailyReportItem" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,

    CONSTRAINT "TelegramDailyReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedExpense_businessId_dueDate_idx" ON "FixedExpense"("businessId", "dueDate");

-- CreateIndex
CREATE INDEX "FixedExpense_businessId_isPaid_idx" ON "FixedExpense"("businessId", "isPaid");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramDailyReport_businessId_date_key" ON "TelegramDailyReport"("businessId", "date");

-- CreateIndex
CREATE INDEX "TelegramDailyReport_businessId_date_idx" ON "TelegramDailyReport"("businessId", "date");

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramDailyReport" ADD CONSTRAINT "TelegramDailyReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramDailyReportItem" ADD CONSTRAINT "TelegramDailyReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TelegramDailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
