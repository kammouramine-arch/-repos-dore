import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { getEmailProvider } from '@/lib/email';

/**
 * Small, secret-free deployment probe used by release and support checks.
 * It distinguishes an unreachable database/email configuration from an
 * authentication failure without returning connection strings or provider
 * credentials.
 */
export async function GET() {
  const started = Date.now();
  try {
    const config = env();
    await prisma.$queryRaw`SELECT 1`;
    const email = getEmailProvider();
    return NextResponse.json({
      status: 'ok',
      database: 'ok',
      email: { provider: email.name, configured: email.name === 'resend' && email.available },
      environment: config.NODE_ENV,
      durationMs: Date.now() - started,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[health] probe failed', error);
    return NextResponse.json({ status: 'degraded', database: 'unavailable', durationMs: Date.now() - started }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
