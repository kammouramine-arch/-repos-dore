import type { Metadata } from 'next';
import Link from 'next/link';
import { getAuthContext } from '@/lib/auth/session';
import { invitationPreview } from '@/server/services/teamService';
import { AcceptInvitationForm } from './accept-form';

export const metadata: Metadata = { title: 'Invitation équipe' };

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation;
  try {
    invitation = await invitationPreview(token);
  } catch {
    return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12"><div className="w-full rounded-3xl border border-line bg-surface p-7 text-center shadow-sm"><h1 className="text-[24px] font-semibold text-ink">Invitation indisponible</h1><p className="mt-2 text-[14px] leading-relaxed text-muted">Cette invitation est invalide, expirée ou a déjà été utilisée.</p><Link href="/connexion" className="mt-6 inline-block text-[13.5px] font-medium text-accent hover:underline">Retour à la connexion</Link></div></main>;
  }
  const auth = await getAuthContext();
  const signedInEmail = auth?.user.email.toLowerCase();
  const matchingAccount = signedInEmail === invitation.email;
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12"><div className="w-full rounded-3xl border border-line bg-surface p-7 shadow-sm sm:p-9"><p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">DEVISERA · ÉQUIPE</p><h1 className="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-ink">Rejoignez {invitation.organizationName}</h1><p className="mt-2 text-[14px] leading-relaxed text-muted">Vous êtes invité à rejoindre cet espace comme <strong className="text-ink">{invitation.role === 'ADMIN' ? 'administrateur' : 'membre'}</strong>. L’invitation est valable jusqu’au {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(invitation.expiresAt)}.</p>{auth && matchingAccount ? <div className="mt-7"><AcceptInvitationForm token={token} /></div> : auth ? <div className="mt-7 space-y-3"><p className="rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-[13px] text-ink">Cette invitation est destinée à une autre adresse email. Connectez-vous avec <strong>{invitation.email}</strong>.</p><Link href={`/connexion?next=${encodeURIComponent(`/invitation/${token}`)}`} className="block text-center text-[13.5px] font-medium text-accent hover:underline">Changer de compte</Link></div> : <div className="mt-7 grid gap-3 sm:grid-cols-2"><Link href={`/connexion?next=${encodeURIComponent(`/invitation/${token}`)}`} className="rounded-xl border border-line px-4 py-3 text-center text-[13.5px] font-medium text-ink hover:bg-elevated">J’ai déjà un compte</Link><Link href={`/inscription?invite=${encodeURIComponent(token)}`} className="rounded-xl bg-accent px-4 py-3 text-center text-[13.5px] font-medium text-white hover:bg-accent/90">Créer mon compte</Link></div>}</div></main>;
}
