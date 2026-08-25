-- AlterTable
ALTER TABLE "History" ADD COLUMN     "confirmationId" TEXT;

-- CreateTable
CREATE TABLE "HistoryConfirmation" (
    "id" TEXT NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoryConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoryConfirmation_confirmedAt_idx" ON "HistoryConfirmation"("confirmedAt");

-- CreateIndex
CREATE INDEX "History_confirmationId_idx" ON "History"("confirmationId");

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "HistoryConfirmation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryConfirmation" ADD CONSTRAINT "HistoryConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
