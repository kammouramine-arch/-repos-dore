'use server';

import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { acceptInvitation } from '@/server/services/teamService';
import { toUserMessage } from '@/lib/errors';

export type InvitationFormState = { error?: string };

export async function acceptInvitationAction(_prev: InvitationFormState, formData: FormData): Promise<InvitationFormState> {
  const token = String(formData.get('token') || '');
  try {
    const auth = await requireAuth();
    await acceptInvitation(auth, token);
  } catch (error) {
    return { error: toUserMessage(error) };
  }
  redirect('/app/parametres/equipe?invitation=accepted');
}
