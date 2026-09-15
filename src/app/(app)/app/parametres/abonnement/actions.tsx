'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, CreditCard, RotateCcw } from 'lucide-react';
import { PLANS, PLAN_ORDER, planChange, type PlanId } from '@devisia/shared';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { formatCents } from '@/lib/money';

/**
 * Actions d'abonnement : souscription, changement de formule, portail de
 * facturation et résiliation. Chaque conséquence est annoncée avant validation.
 */
export function PlanActions({
  currentPlan,
  status,
  hasSubscription,
  billingReady,
  canManage,
  cancelAtPeriodEnd,
  periodEnd,
}: {
  currentPlan: PlanId;
  status: string;
  hasSubscription: boolean;
  billingReady: boolean;
  canManage: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [plan, setPlan] = React.useState<PlanId>(currentPlan);
  const [pending, setPending] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const subscribed = hasSubscription && status !== 'trialing';
  const direction = planChange(currentPlan, plan);

  async function call<T>(path: string, key: string, body?: unknown): Promise<T | null> {
    setPending(key);
    setError(null);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as { data?: T; error?: { message: string } };
      if (!response.ok || payload.error) {
        setError(payload.error?.message ?? 'Action impossible.');
        return null;
      }
      return payload.data ?? null;
    } catch {
      setError('Connexion impossible. Réessayez dans un instant.');
      return null;
    } finally {
      setPending(null);
    }
  }

  async function subscribe() {
    if (subscribed) {
      const result = await call<{ effectiveAt: string | null }>('/api/billing/formule', 'plan', { plan });
      if (!result) return;
      toast({
        title: `Formule ${PLANS[plan].name}`,
        description: result.effectiveAt
          ? `Effective le ${new Date(result.effectiveAt).toLocaleDateString('fr-FR')}.`
          : 'Appliquée immédiatement.',
      });
      router.refresh();
      return;
    }

    const result = await call<{ url: string }>('/api/billing/checkout', 'plan', { plan });
    if (result?.url) window.location.href = result.url;
  }

  async function openPortal() {
    const result = await call<{ url: string }>('/api/billing/portail', 'portal');
    if (result?.url) window.location.href = result.url;
  }

  async function resume() {
    const result = await call('/api/billing/reprise', 'resume');
    if (result) {
      toast({ title: 'Abonnement repris' });
      router.refresh();
    }
  }

  async function cancel() {
    const result = await call<{ endsAt: string | null }>('/api/billing/annulation', 'cancel', {
      immediate: false,
    });
    if (!result) return;
    setCancelOpen(false);
    toast({
      title: 'Résiliation programmée',
      description: result.endsAt
        ? `Accès conservé jusqu’au ${new Date(result.endsAt).toLocaleDateString('fr-FR')}.`
        : undefined,
    });
    router.refresh();
  }

  if (!canManage) {
    return (
      <p className="border-t border-line pt-4 text-[13px] text-subtle">
        Seul le propriétaire du compte peut modifier l’abonnement.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t border-line pt-4">
      {error ? <Alert tone="danger" icon={AlertTriangle}>{error}</Alert> : null}

      {cancelAtPeriodEnd ? (
        <Alert tone="info" icon={RotateCcw} title="Résiliation programmée">
          {periodEnd
            ? `Votre accès reste ouvert jusqu’au ${new Date(periodEnd).toLocaleDateString('fr-FR')}.`
            : 'Votre accès reste ouvert jusqu’à la fin de la période en cours.'}
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            loading={pending === 'resume'}
            onClick={() => void resume()}
          >
            Reprendre mon abonnement
          </Button>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <Select
          value={plan}
          onChange={(event) => setPlan(event.target.value as PlanId)}
          className="w-[196px]"
          aria-label="Choisir une formule"
        >
          {PLAN_ORDER.map((id) => (
            <option key={id} value={id}>
              {PLANS[id].name} — {formatCents(PLANS[id].monthlyPriceCents, { compact: true })}/mois
            </option>
          ))}
        </Select>

        <Button
          loading={pending === 'plan'}
          disabled={!billingReady || (subscribed && direction === 'same')}
          onClick={() => void subscribe()}
        >
          {!subscribed
            ? `Souscrire à ${PLANS[plan].name}`
            : direction === 'downgrade'
              ? `Passer en ${PLANS[plan].name} à l’échéance`
              : `Passer en ${PLANS[plan].name}`}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Button>

        {hasSubscription ? (
          <Button variant="secondary" loading={pending === 'portal'} onClick={() => void openPortal()}>
            <CreditCard className="h-4 w-4" aria-hidden />
            Gérer ma facturation
          </Button>
        ) : null}
      </div>

      {subscribed && direction === 'downgrade' ? (
        <p className="text-[12.5px] text-muted">
          Le changement prendra effet à la fin de la période déjà payée : vous conservez d’ici là
          toutes les fonctionnalités de votre formule actuelle.
        </p>
      ) : null}

      {subscribed && !cancelAtPeriodEnd ? (
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className="text-[13px] text-muted underline-offset-4 transition-colors hover:text-danger hover:underline"
        >
          Résilier mon abonnement
        </button>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Résilier votre abonnement ?</DialogTitle>
            <DialogDescription>
              Votre accès reste ouvert jusqu’à la fin de la période déjà payée. Vos devis, clients et
              catalogue sont conservés et restent exportables.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Alert tone="warning" icon={AlertTriangle}>
              Sans abonnement, vous ne pourrez plus créer ni envoyer de nouveaux devis, et les
              relances automatiques s’arrêteront.
            </Alert>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Garder mon abonnement
            </Button>
            <Button variant="danger" loading={pending === 'cancel'} onClick={() => void cancel()}>
              Confirmer la résiliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
