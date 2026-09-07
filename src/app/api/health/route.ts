import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { configurationReport, env } from '@/lib/env';
import { describeSendingDomain, getEmailProvider } from '@/lib/email';
import { aiCapabilities } from '@/lib/ai';

/**
 * Sonde de déploiement, sans secret, pour les vérifications de mise en ligne
 * et le support.
 *
 * La version précédente enveloppait configuration, base et email dans un seul
 * `try` et répondait « database: unavailable » quelle que soit la cause : une
 * variable d'environnement mal saisie s'affichait comme une panne de base de
 * données, ce qui a coûté une journée de diagnostic. Chaque composant est
 * désormais mesuré séparément et nommé. Seule la base est critique : sans
 * elle, 503 ; un service optionnel dégradé laisse le statut à 200 avec son
 * détail visible.
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, unknown> = {};
  let critical = false;

  const configuration = configurationReport();
  checks.configuration = {
    status: configuration.missing.length > 0 ? 'invalid' : configuration.ignored.length > 0 ? 'degraded' : 'ok',
    missing: configuration.missing,
    ignored: configuration.ignored,
  };
  if (configuration.missing.length > 0) critical = true;

  const databaseStarted = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', durationMs: Date.now() - databaseStarted };
  } catch (error) {
    critical = true;
    console.error('[health] base de données injoignable', error);
    checks.database = { status: 'unavailable', durationMs: Date.now() - databaseStarted };
  }

  try {
    const email = getEmailProvider();
    // Une clé présente ne suffit pas : le domaine d'expédition doit être
    // vérifié chez le fournisseur, sinon chaque code de confirmation est refusé.
    const sending = await describeSendingDomain();
    checks.email = {
      provider: email.name,
      configured: email.name === 'resend' && email.available,
      sendingDomain: sending,
    };
  } catch (error) {
    console.error('[health] fournisseur email indisponible', error);
    checks.email = { provider: 'unavailable', configured: false };
  }

  try {
    const ai = aiCapabilities();
    checks.ai = {
      provider: ai.provider,
      generation: ai.generation,
      // La dictée iPhone est transcrite sur l'appareil (reconnaissance vocale
      // native) : `false` ici ne concerne que la transcription côté serveur,
      // activée par TRANSCRIPTION_PROVIDER=openai + TRANSCRIPTION_API_KEY.
      transcription: ai.transcription,
      transcriptionNote: ai.transcription ? undefined : 'iOS dictation runs on-device; server transcription is optional',
    };
  } catch (error) {
    console.error('[health] fournisseur IA indisponible', error);
    checks.ai = { provider: 'unavailable', generation: false, transcription: false };
  }

  let environment: string | null = null;
  try {
    environment = env().NODE_ENV;
  } catch {
    environment = null;
  }

  const degraded = critical || (checks.configuration as { status: string }).status !== 'ok';
  return NextResponse.json(
    {
      status: critical ? 'unavailable' : degraded ? 'degraded' : 'ok',
      environment,
      durationMs: Date.now() - started,
      checks,
    },
    { status: critical ? 503 : 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
