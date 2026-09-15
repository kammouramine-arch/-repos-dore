-- A user's language is only authoritative once they chose it. Existing rows
-- keep their `locale` value but are considered inferred (sign-up device,
-- defaults): clients follow the device language until an explicit choice
-- exists, so an accidental "en" no longer overrides a French iPhone.
ALTER TABLE "users" ADD COLUMN "localeChosenAt" TIMESTAMP(3);
