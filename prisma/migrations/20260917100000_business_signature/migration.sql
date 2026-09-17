-- Signature manuscrite de l'entreprise.
--
-- Tracée une fois par l'artisan, apposée sur les documents qu'il émet. Elle
-- n'a rien à voir avec `quote_signatures`, qui enregistre l'acceptation du
-- client : ici c'est l'émetteur qui signe, avant l'envoi.
--
-- Colonnes ajoutées avec `IF NOT EXISTS` : la migration doit pouvoir être
-- rejouée sur une base déjà à jour sans échouer.
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "signatureStrokePath" TEXT;
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "signatureName" TEXT;
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "signatureDrawnAt" TIMESTAMP(3);
