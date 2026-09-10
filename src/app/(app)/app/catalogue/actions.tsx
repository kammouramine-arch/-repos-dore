'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Download, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { PriceBookForm } from './form';

export function PriceBookActions({ mode = 'toolbar' }: { mode?: 'toolbar' | 'empty' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function importCsv(file: File) {
    setImporting(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/pricebook/import', { method: 'POST', body: form });
      const payload = (await response.json()) as
        | { data: { created: number; updated: number; skipped: number } }
        | { error: { message: string } };

      if (!response.ok || 'error' in payload) {
        toast({
          title: 'Import impossible',
          description: 'error' in payload ? payload.error.message : undefined,
          tone: 'error',
        });
        return;
      }

      toast({
        title: 'Import terminé',
        description: `${payload.data.created} créés, ${payload.data.updated} mis à jour, ${payload.data.skipped} ignorés.`,
      });
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  if (mode === 'empty') {
    return (
      <>
        <Button size="lg" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Ajouter mon premier article
        </Button>
        <PriceBookForm open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <Button variant="secondary" size="sm" asChild>
        <a href="/api/pricebook/export" download>
          <Download className="h-4 w-4" aria-hidden />
          Exporter
        </a>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        loading={importing}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden />
        Importer un CSV
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importCsv(file);
          event.target.value = '';
        }}
      />

      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        Nouvel article
      </Button>

      <PriceBookForm open={open} onOpenChange={setOpen} />
    </>
  );
}
