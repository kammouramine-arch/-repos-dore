'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { saveNotificationSettings, updateAutomation, type SettingsState } from '../actions';

interface Automation {
  id: string;
  name: string;
  trigger: string;
  delayHours: number;
  isActive: boolean;
  requireApproval: boolean;
}

const DELAYS = [
  { value: 24, label: '24 heures' },
  { value: 48, label: '48 heures' },
  { value: 72, label: '3 jours' },
  { value: 120, label: '5 jours' },
  { value: 168, label: '7 jours' },
  { value: 336, label: '14 jours' },
];

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  DEVIS_NON_CONSULTE: 'Le client n’a pas ouvert le devis.',
  DEVIS_CONSULTE_SANS_REPONSE: 'Le client a ouvert le devis mais n’a pas répondu.',
  DEVIS_SANS_REPONSE: 'Dernière relance avant classement sans suite.',
  FACTURE_IMPAYEE: 'Facture échue non réglée.',
  PROSPECT_SANS_SUITE: 'Prospect sans activité depuis plusieurs jours.',
};

export function AutomationSettings({
  automations,
  settings,
}: {
  automations: Automation[];
  settings: {
    notifyOnQuoteViewed: boolean;
    notifyOnQuoteAccepted: boolean;
    notifyOnQuoteRefused: boolean;
    notifyOnNewLead: boolean;
    notifyByEmail: boolean;
    followUpsEnabled: boolean;
    publicLeadFormEnabled: boolean;
    aiSignature: string;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(saveNotificationSettings, {} as SettingsState);
  const [busy, setBusy] = React.useState<string | null>(null);

  async function patch(id: string, data: Parameters<typeof updateAutomation>[1]) {
    setBusy(id);
    const result = await updateAutomation(id, data);
    setBusy(null);
    if (!result.ok) {
      toast({ title: 'Mise à jour impossible', description: result.error, tone: 'error' });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Séquence de relance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-1">
          {automations
            .filter((automation) => automation.trigger.startsWith('DEVIS'))
            .map((automation) => (
              <div
                key={automation.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink">{automation.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    {TRIGGER_DESCRIPTIONS[automation.trigger] ?? ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Select
                    value={String(automation.delayHours)}
                    disabled={busy === automation.id}
                    onChange={(event) =>
                      void patch(automation.id, { delayHours: Number(event.target.value) })
                    }
                    className="h-9 w-[128px]"
                    aria-label={`Délai — ${automation.name}`}
                  >
                    {DELAYS.map((delay) => (
                      <option key={delay.value} value={delay.value}>
                        {delay.label}
                      </option>
                    ))}
                  </Select>

                  <Switch
                    checked={automation.isActive}
                    disabled={busy === automation.id}
                    onCheckedChange={(checked) => void patch(automation.id, { isActive: checked })}
                    aria-label={`Activer — ${automation.name}`}
                  />
                </div>
              </div>
            ))}

          <p className="text-[12.5px] leading-relaxed text-subtle">
            Les relances arrivées à échéance apparaissent dans l’onglet Relances : vous relisez le
            message puis vous l’envoyez. Aucun message n’est envoyé sans votre validation.
          </p>
        </CardContent>
      </Card>

      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
            {state.success ? (
              <Alert tone="success" icon={CheckCircle2}>
                {state.success}
              </Alert>
            ) : null}

            {[
              ['followUpsEnabled', 'Préparer automatiquement les relances', settings.followUpsEnabled],
              ['notifyOnQuoteViewed', 'M’alerter quand un client consulte un devis', settings.notifyOnQuoteViewed],
              ['notifyOnNewLead', 'M’alerter à chaque nouvelle demande', settings.notifyOnNewLead],
              ['notifyByEmail', 'Recevoir aussi les alertes par email', settings.notifyByEmail],
              ['publicLeadFormEnabled', 'Activer le formulaire public de demande de devis', settings.publicLeadFormEnabled],
            ].map(([name, label, defaultChecked]) => (
              <label
                key={String(name)}
                className="flex cursor-pointer items-center justify-between gap-4 text-[14px] text-ink-soft"
              >
                {label}
                <input
                  type="checkbox"
                  name={String(name)}
                  defaultChecked={Boolean(defaultChecked)}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded-[6px] border-line-strong text-accent focus:ring-accent/20"
                />
              </label>
            ))}

            <Field label="Signature des messages" htmlFor="aiSignature" hint="utilisée dans les relances">
              <Input
                id="aiSignature"
                name="aiSignature"
                defaultValue={settings.aiSignature}
                maxLength={200}
                placeholder="Karim Benali — Plomberie Martin"
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" loading={pending}>
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
