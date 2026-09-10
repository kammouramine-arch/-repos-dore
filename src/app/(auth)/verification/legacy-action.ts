'use server';
import { redirect } from 'next/navigation';
import { verifyEmail } from '@/server/services/authService';

export async function confirmLegacyEmail(_state: string, data: FormData): Promise<string> {
  const token = data.get('token');
  if (typeof token !== 'string' || token.length > 512) return 'Lien invalide ou expiré.';
  try { await verifyEmail(token); } catch { return 'Lien invalide ou expiré. Reconnectez-vous pour demander un code.'; }
  redirect('/app');
}
