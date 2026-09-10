import { NextResponse, type NextRequest } from 'next/server';

/**
 * Préflight CORS de l'API.
 *
 * Les applications mobiles s'authentifient par jeton porteur : l'origine est
 * ouverte, mais aucune autorisation d'envoi de cookies n'est accordée, ce qui
 * empêche tout rejeu de session depuis un site tiers.
 */
export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
