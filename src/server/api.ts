import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AppError, isAppError } from '@/lib/errors';

/** Réponse JSON standardisée pour toute l'API. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          retryable: error.retryable,
          retryAfterSeconds: error.retryAfterSeconds,
        },
      },
      { status: error.status, headers: error.retryAfterSeconds !== undefined ? { 'Retry-After': String(error.retryAfterSeconds) } : undefined },
    );
  }

  if (error instanceof z.ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'global';
      details[key] = [...(details[key] ?? []), issue.message];
    }
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION',
          message: 'Les informations transmises sont incomplètes ou invalides.',
          details,
        },
      },
      { status: 422 },
    );
  }

  // Aucune stack trace n'est exposée : le détail reste dans les journaux
  // serveur. La référence courte relie ce que voit l'artisan à la ligne de
  // journal correspondante — sans elle, un « problème temporaire » signalé
  // depuis un iPhone est introuvable parmi les requêtes du jour.
  const requestId = randomUUID().slice(0, 8);
  console.error(`[api] erreur non gérée ref=${requestId}`, error);
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL',
        message: "Une erreur inattendue s'est produite. Merci de réessayer.",
        retryable: true,
        requestId,
      },
    },
    { status: 500, headers: { 'x-request-id': requestId } },
  );
}

/** Enveloppe un handler de route : validation, erreurs typées, journalisation. */
export function route<T>(handler: () => Promise<NextResponse<T>>) {
  return handler().catch(fail);
}

/** Analyse et valide le corps JSON d'une requête. */
export async function parseBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new AppError('VALIDATION', 'Corps de requête invalide.');
  }
  return schema.parse(payload);
}

/** Analyse et valide les paramètres de requête. */
export function parseQuery<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): z.infer<TSchema> {
  const url = new URL(request.url);
  const entries: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    entries[key] = value;
  });
  return schema.parse(entries);
}

export const idSchema = z.string().uuid('Identifiant invalide.');
