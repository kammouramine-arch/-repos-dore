-- Apple renewal preference (downgrade recorded by Apple, effective at the next
-- renewal). Informational only: entitlement keeps following "plan" until Apple
-- signs the renewal transaction.
ALTER TABLE "subscriptions"
    ADD COLUMN "applePendingProductId" TEXT,
    ADD COLUMN "applePendingAt" TIMESTAMP(3);
