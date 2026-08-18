/**
 * Environnement de test : base dédiée, aucun appel externe.
 * Les fournisseurs IA, email, stockage et Stripe restent non configurés, ce qui
 * force les chemins locaux et rend les tests déterministes.
 */
Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? 'test' });
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://devisia:devisia@127.0.0.1:5432/devisia_test?schema=public';
process.env.APP_URL = 'http://localhost:3000';
process.env.AUTH_SECRET = 'test-secret-devisia-0123456789';
process.env.AI_PROVIDER = 'local';
process.env.EMAIL_PROVIDER = 'console';
process.env.STORAGE_PROVIDER = 'local';
process.env.STORAGE_LOCAL_DIR = './.tmp-storage';
delete process.env.ANTHROPIC_API_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.STRIPE_SECRET_KEY;
