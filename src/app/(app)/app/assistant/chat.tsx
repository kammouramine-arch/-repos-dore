'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: { label: string; href?: string | null }[];
}

const SUGGESTIONS = [
  'Combien de devis ai-je envoyés ?',
  'Quels clients n’ont pas répondu ?',
  'Combien ai-je gagné ce mois-ci ?',
  'Montre-moi les devis supérieurs à 2 000 €',
];

export function AssistantChat({ degraded }: { degraded: boolean }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  async function ask(question: string) {
    if (!question.trim() || pending) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: question };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setPending(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const payload = (await response.json()) as
        | { data: { answer: string; actions: { label: string; href?: string | null }[] } }
        | { error: { message: string } };

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text:
            'error' in payload
              ? payload.error.message
              : payload.data.answer,
          actions: 'error' in payload ? [] : payload.data.actions,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Connexion impossible. Réessayez dans un instant.',
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {degraded ? (
        <p className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-[12.5px] text-muted">
          Mode local : les réponses sont calculées directement à partir de vos données, sans
          fournisseur d’IA externe.
        </p>
      ) : null}

      <Card className="flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 p-5">
          {messages.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-accent-soft">
                <Sparkles className="h-5 w-5 text-accent" aria-hidden />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-ink">Que voulez-vous savoir ?</p>
              <p className="mt-1 text-[13.5px] text-muted">
                L’assistant lit vos devis, vos clients et votre chiffre d’affaires.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    className="rounded-full border border-line bg-canvas px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[80%] rounded-[14px] rounded-br-[4px] bg-accent px-4 py-2.5 text-[14px] text-white'
                    : 'max-w-[85%] rounded-[14px] rounded-bl-[4px] border border-line bg-surface/70 px-4 py-3'
                }
              >
                <p className="whitespace-pre-line text-[14px] leading-relaxed">{message.text}</p>
                {message.actions && message.actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action) =>
                      action.href ? (
                        <Link
                          key={action.label}
                          href={action.href}
                          className="rounded-[8px] border border-line bg-canvas px-2.5 py-1 text-[12.5px] font-medium text-accent hover:bg-accent-soft"
                        >
                          {action.label}
                        </Link>
                      ) : (
                        <Badge key={action.label} tone="outline">
                          {action.label}
                        </Badge>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-[14px] rounded-bl-[4px] border border-line bg-surface/70 px-4 py-3">
                <span className="flex gap-1" aria-label="Réponse en cours">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-subtle"
                      style={{ animationDelay: `${index * 0.15}s` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          ) : null}

          <div ref={endRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(input);
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Posez votre question…"
            aria-label="Votre question"
            maxLength={600}
          />
          <Button type="submit" size="icon" loading={pending} aria-label="Envoyer">
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      </Card>

      <p className="text-center text-[12px] text-subtle">
        L’assistant propose, vous décidez : aucune action n’est exécutée sans votre validation.
      </p>
    </div>
  );
}
