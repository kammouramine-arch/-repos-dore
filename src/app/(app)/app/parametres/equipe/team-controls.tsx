'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, Check, MailPlus, RefreshCw, Trash2, UserRoundPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { initials } from '@/lib/utils';

type Member = { id: string; email: string; firstName: string | null; lastName: string | null; role: 'OWNER' | 'ADMIN' | 'MEMBER'; createdAt: string };
type Invitation = { id: string; email: string; role: 'ADMIN' | 'MEMBER'; expiresAt: string; createdAt: string };
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export function TeamControls({ plan, seats, usedSeats, pendingSeats, members, invitations, currentRole }: { plan: string; seats: number; usedSeats: number; pendingSeats: number; members: Member[]; invitations: Invitation[]; currentRole: 'OWNER' | 'ADMIN' | 'MEMBER' }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canInvite = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const canManageRoles = currentRole === 'OWNER';

  async function request(url: string, init: RequestInit, successMessage: string) {
    setError(null); setSuccess(null);
    const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
    const payload = await response.json().catch(() => null) as { data?: unknown; error?: { message?: string } } | null;
    if (!response.ok) throw new Error(payload?.error?.message ?? 'Une erreur est survenue.');
    setSuccess(successMessage); return payload?.data;
  }
  function run(task: () => Promise<unknown>) {
    startTransition(async () => { try { await task(); window.location.reload(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.'); } });
  }

  return <>
    {error ? <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{error}</div> : null}
    {success ? <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[13px] text-success" role="status"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{success}</div> : null}
    <Card><CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle>Membres</CardTitle><p className="mt-1 text-[12.5px] text-muted">{usedSeats} / {seats} places utilisées{pendingSeats ? ` · ${pendingSeats} invitation${pendingSeats > 1 ? 's' : ''} en attente` : ''}</p></div><Badge tone="outline">{plan}</Badge></CardHeader><CardContent className="pt-1"><ul className="divide-y divide-line">{members.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-semibold text-accent">{initials(member.firstName, member.lastName) || initials(member.email)}</span><div className="min-w-0"><p className="truncate text-[14px] font-medium text-ink">{[member.firstName, member.lastName].filter(Boolean).join(' ') || member.email}</p><p className="truncate text-[12.5px] text-muted">{member.email}</p></div></div><div className="flex items-center gap-2">{canManageRoles && member.role !== 'OWNER' ? <select aria-label={`Rôle de ${member.email}`} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px] text-ink" value={member.role} disabled={isPending} onChange={(event) => run(() => request(`/api/team/members/${member.id}`, { method: 'PATCH', body: JSON.stringify({ role: event.target.value }) }, 'Rôle mis à jour.'))}><option value="MEMBER">Membre</option><option value="ADMIN">Administrateur</option></select> : <Badge tone={member.role === 'OWNER' ? 'accent' : 'outline'}>{ROLE_LABELS[member.role]}</Badge>}{canInvite && member.role !== 'OWNER' ? <button type="button" aria-label={`Supprimer ${member.email}`} className="rounded-lg p-2 text-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50" disabled={isPending} onClick={() => { if (window.confirm('Retirer ce membre de l’espace ?')) run(() => request(`/api/team/members/${member.id}`, { method: 'DELETE' }, 'Membre retiré.')); }}><Trash2 className="h-4 w-4" aria-hidden /></button> : null}</div></li>)}</ul></CardContent></Card>
    {invitations.length > 0 ? <Card><CardHeader><CardTitle>Invitations en attente</CardTitle></CardHeader><CardContent className="pt-1"><ul className="divide-y divide-line">{invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-[13.5px] font-medium text-ink">{invitation.email}</p><p className="text-[12px] text-subtle">{ROLE_LABELS[invitation.role]} · expire le {dateFormatter.format(new Date(invitation.expiresAt))}</p></div>{canInvite ? <div className="flex items-center gap-1"><button type="button" className="rounded-lg p-2 text-subtle hover:bg-accent-soft hover:text-accent disabled:opacity-50" aria-label={`Renvoyer à ${invitation.email}`} disabled={isPending} onClick={() => run(() => request(`/api/team/invitations/${invitation.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'resend' }) }, 'Invitation renvoyée.'))}><RefreshCw className="h-4 w-4" aria-hidden /></button><button type="button" className="rounded-lg p-2 text-subtle hover:bg-danger-soft hover:text-danger disabled:opacity-50" aria-label={`Annuler ${invitation.email}`} disabled={isPending} onClick={() => run(() => request(`/api/team/invitations/${invitation.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) }, 'Invitation annulée.'))}><Trash2 className="h-4 w-4" aria-hidden /></button></div> : null}</li>)}</ul></CardContent></Card> : null}
    {canInvite ? <Card><CardHeader><CardTitle>Inviter un collaborateur</CardTitle><p className="mt-1 text-[13px] text-muted">L’invitation expire après 7 jours et réserve une place jusqu’à son expiration.</p></CardHeader><CardContent><form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get('email') || ''); const role = String(form.get('role') || 'MEMBER'); run(() => request('/api/team', { method: 'POST', body: JSON.stringify({ email, role }) }, 'Invitation envoyée.')); event.currentTarget.reset(); }}><label className="sr-only" htmlFor="team-email">Adresse email</label><input id="team-email" name="email" type="email" required placeholder="collaborateur@entreprise.fr" className="min-w-0 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none ring-accent/30 placeholder:text-subtle focus:ring-2" /><label className="sr-only" htmlFor="team-role">Rôle</label><select id="team-role" name="role" className="rounded-xl border border-line bg-surface px-3 py-2.5 text-[13.5px] text-ink"><option value="MEMBER">Membre</option>{currentRole === 'OWNER' ? <option value="ADMIN">Administrateur</option> : null}</select><Button type="submit" loading={isPending}><MailPlus className="h-4 w-4" aria-hidden />Inviter</Button></form></CardContent></Card> : <Card><CardContent className="flex items-start gap-3 py-5"><UserRoundPlus className="mt-0.5 h-5 w-5 text-accent" aria-hidden /><div><p className="text-[14px] font-medium text-ink">Les équipes commencent avec Pro</p><p className="mt-1 text-[13px] leading-relaxed text-muted">Passez à Pro pour inviter jusqu’à 3 utilisateurs et partager vos devis, clients et quotas IA.</p></div></CardContent></Card>}
  </>;
}
