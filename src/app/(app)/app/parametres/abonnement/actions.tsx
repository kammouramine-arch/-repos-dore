'use client';

import * as React from 'react';
import type { SubscriptionPlan } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { PLANS, PLAN_ORDER } from '@/lib/billing/plans';

export function PlanActions({
  currentPlan,
  hasSubscription,
  billingReady,
  canManage,
}: {
  currentPlan: SubscriptionPlan;
  hasSubscription: boolean;
  billingReady: boolean;
  canManage: boolean;
}) {
  const { toast } = useToast();
  const [plan, setPlan] = React.useState<SubscriptionPlan>(currentPlan);
  const [pending, setPending] = React.useState(false);

  async function go(path: string, body?: unknown) {
    setPending(true);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as
        | { data: { url: string } }
        | { error: { message: string } };
      if (!response.ok || 'error' in payload) {
        toast({
          title: 'Action impossible',
          description: 'error' in payload ? payload.error.message : undefined,
          tone: 'error',
        });
        return;
      }
      window.location.href = payload.data.url;
    } catch {
      toast({ title: 'Connexion impossible', tone: 'error' });
    } finally {
      setPending(false);
    }
  }

  if (!canManage) {
    return (
      <p className="text-[13px] text-subtle">
        Seul le propriétaire du compte peut modifier l’abonnement.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
      <Select
        value={plan}
        onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
        className="w-[184px]"
        aria-label="Choisir une formule"
      >
        {PLAN_ORDER.map((id) => (
          <option key={id} value={id}>
            {PLANS[id].name}
          </option>
        ))}
      </Select>

      <Button
        loading={pending}
        disabled={!billingReady}
        onClick={() => void go('/api/billing/checkout', { plan })}
      >
        {plan === currentPlan ? 'Confirmer ma formule' : `Passer à ${PLANS[plan].name}`}
      </Button>

      {hasSubscription ? (
        <Button variant="secondary" loading={pending} onClick={() => void go('/api/billing/portail')}>
          Gérer ma facturation
        </Button>
      ) : null}
    </div>
  );
}
