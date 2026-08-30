import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic de la connexion à la base, réservé à l'exploitation.
 *
 * Lorsqu'une route répond 500, le détail reste dans les journaux du serveur —
 * c'est voulu, mais cela suppose d'y avoir accès. Cette route rend la même
 * information sous une forme exploitable à distance, sans jamais divulguer
 * d'identifiant : la chaîne de connexion est décomposée en hôte, port et
 * paramètres, le nom d'utilisateur est réduit à sa forme, et le mot de passe
 * n'est jamais lu.
 *
 * Protégée par le même secret partagé que les tâches planifiées.
 */
interface ConnectionShape {
  defined: boolean;
  host?: string;
  port?: string;
  database?: string;
  /** Forme du nom d'utilisateur, jamais sa valeur. */
  userShape?: 'postgres' | 'postgres.<ref>' | 'autre';
  params?: string[];
  parseError?: string;
}

/** Décompose une URL de connexion sans jamais exposer les identifiants. */
function describe(raw: string | undefined): ConnectionShape {
  if (!raw?.trim()) return { defined: false };

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { defined: true, parseError: 'URL illisible (mot de passe non encodé ?)' };
  }

  const user = decodeURIComponent(url.username);
  const userShape =
    user === 'postgres' ? 'postgres' : /^postgres\.[a-z0-9]+$/i.test(user) ? 'postgres.<ref>' : 'autre';

  return {
    defined: true,
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace(/^\//, '') || '(défaut)',
    userShape,
    params: [...url.searchParams.keys()].sort(),
  };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET non configuré.' }, { status: 503 });
  }
  if (request.headers.get('authorization')?.replace('Bearer ', '') !== secret) {
    return Response.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const configuration = {
    databaseUrl: describe(process.env.DATABASE_URL),
    directUrl: describe(process.env.DIRECT_URL),
    appUrl: process.env.APP_URL ?? null,
    authSecretDefined: Boolean(process.env.AUTH_SECRET),
    region: process.env.VERCEL_REGION ?? null,
  };

  const started = Date.now();
  try {
    const [{ tables }] = await prisma.$queryRawUnsafe<{ tables: number }[]>(
      `SELECT count(*)::int AS tables FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const organizations = await prisma.organization.count();

    return Response.json({
      data: {
        connected: true,
        latencyMs: Date.now() - started,
        tables,
        organizations,
        configuration,
      },
    });
  } catch (error) {
    // Le message de Prisma nomme la cause — hôte injoignable, authentification
    // refusée, base absente — sans jamais contenir le mot de passe.
    const cause = error as { name?: string; code?: string; errorCode?: string; message?: string };
    return Response.json(
      {
        data: {
          connected: false,
          latencyMs: Date.now() - started,
          error: {
            name: cause.name ?? 'Error',
            code: cause.code ?? cause.errorCode ?? null,
            message: (cause.message ?? '').split('\n').filter(Boolean).slice(0, 4).join(' · '),
          },
          configuration,
        },
      },
      { status: 200 },
    );
  }
}
