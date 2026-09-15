'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, UserPlus } from 'lucide-react';
import type { LeadStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'NOUVEAU', label: 'Nouveau' },
  { value: 'CONTACTE', label: 'Contacté' },
  { value: 'QUALIFIE', label: 'Qualifié' },
  { value: 'DEVIS_ENVOYE', label: 'Devis envoyé' },
  { value: 'RELANCE', label: 'Relance' },
  { value: 'GAGNE', label: 'Gagné' },
  { value: 'PERDU', label: 'Perdu' },
];

export function LeadWorkflow({
  leadId,
  status,
  hasCustomer,
  customerId,
}: {
  leadId: string;
  status: LeadStatus;
  hasCustomer: boolean;
  customerId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function updateStatus(next: LeadStatus) {
    setPending(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        toast({ title: 'Mise à jour impossible', tone: 'error' });
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function convert() {
    setPending(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/convertir`, { method: 'POST' });
      const payload = (await response.json()) as
        | { data: { customerId: string } }
        | { error: { message: string } };
      if (!response.ok || 'error' in payload) {
        toast({ title: 'Conversion impossible', tone: 'error' });
        return;
      }
      toast({ title: 'Prospect converti', description: 'Le client et le chantier ont été créés.' });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        onChange={(event) => void updateStatus(event.target.value as LeadStatus)}
        disabled={pending}
        className="w-[168px]"
        aria-label="Statut du prospect"
      >
        {STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>

      {hasCustomer ? (
        <Button asChild>
          <a href={customerId ? `/app/devis/nouveau` : '#'}>
            <FileText className="h-4 w-4" aria-hidden />
            Créer le devis
          </a>
        </Button>
      ) : (
        <Button onClick={() => void convert()} loading={pending}>
          <UserPlus className="h-4 w-4" aria-hidden />
          Convertir en client
        </Button>
      )}
    </div>
  );
}
