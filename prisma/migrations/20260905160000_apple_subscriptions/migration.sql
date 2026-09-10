ALTER TABLE "subscriptions"
  ADD COLUMN "appleOriginalTransactionId" TEXT,
  ADD COLUMN "appleProductId" TEXT,
  ADD COLUMN "appleEnvironment" TEXT,
  ADD COLUMN "appleSignedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "subscriptions_appleOriginalTransactionId_key" ON "subscriptions"("appleOriginalTransactionId");
