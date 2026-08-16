import { PrismaClient } from "@prisma/client";

// En developpement, Next.js recharge le module a chaque modification.
// Sans ce cache global, on ouvrirait une nouvelle connexion a chaque fois.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
