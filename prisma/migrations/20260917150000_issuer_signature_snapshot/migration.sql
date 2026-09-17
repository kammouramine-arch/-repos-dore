-- Signature de l'entreprise figée sur le document au moment où il part.
--
-- Sans cela, remplacer sa signature dans l'application changeait l'apparence
-- de devis et de factures déjà reçus par des clients. Un document envoyé ne
-- doit plus bouger.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "issuerSignaturePath" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "issuerSignatureName" TEXT;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "issuerSignatureAt" TIMESTAMP(3);

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issuerSignaturePath" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issuerSignatureName" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "issuerSignatureAt" TIMESTAMP(3);
