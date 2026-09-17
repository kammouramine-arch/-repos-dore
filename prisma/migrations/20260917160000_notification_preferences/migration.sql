-- Préférences de notification par utilisateur, et la relance de facture
-- impayée qui manquait au catalogue.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB;

-- `ADD VALUE IF NOT EXISTS` plutôt qu'un bloc `DO` : dans un bloc, le nom du
-- type passe par `regtype`, qui replie l'identifiant en minuscules et ne
-- retrouve pas « NotificationType ». La forme directe est aussi la seule qui
-- reste idempotente sur une base déjà migrée.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FACTURE_EN_RETARD';
