-- These tables are accessed exclusively through the authorized Prisma server.
-- Table owners retain access; unprivileged Supabase Data API roles receive no rows.
ALTER TABLE "email_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "file_blobs" ENABLE ROW LEVEL SECURITY;
