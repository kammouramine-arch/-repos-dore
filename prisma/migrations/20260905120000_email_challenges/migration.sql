CREATE TABLE "email_challenges" (
  "userId" UUID NOT NULL,
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "sendCount" INTEGER NOT NULL DEFAULT 1,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "email_challenges_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "email_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "email_challenges_id_key" ON "email_challenges"("id");
