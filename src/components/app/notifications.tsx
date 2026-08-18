'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { formatRelative } from '@/lib/i18n/format';

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = React.useState(initialUnread);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) return;
      const payload = (await response.json()) as {
        data: { items: NotificationItem[]; unread: number };
      };
      setItems(payload.data.items);
      setUnread(payload.data.unread);
      setLoaded(true);
    } catch {
      // Silencieux : la cloche reste utilisable, le lien vers la page complète existe.
    }
  }, []);

  const markAllRead = async () => {
    setUnread(0);
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    await fetch('/api/notifications', { method: 'POST' }).catch(() => undefined);
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && !loaded && void load()}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-surface-2"
          aria-label={unread > 0 ? `Notifications, ${unread} non lues` : 'Notifications'}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[320px] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-[13px] font-semibold text-ink">Notifications</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 text-[12px] text-muted transition-colors hover:text-accent"
            >
              <Check className="h-3 w-3" aria-hidden />
              Tout marquer comme lu
            </button>
          ) : null}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-subtle">
              {loaded ? 'Aucune notification.' : 'Chargement…'}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const content = (
                  <>
                    <p className="text-[13px] font-medium leading-snug text-ink">{item.title}</p>
                    {item.body ? (
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                        {item.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11.5px] text-subtle">{formatRelative(item.createdAt)}</p>
                  </>
                );
                return (
                  <li key={item.id} className={item.readAt ? '' : 'bg-accent-soft/40'}>
                    {item.href ? (
                      <Link href={item.href} className="block px-4 py-3 transition-colors hover:bg-surface-2">
                        {content}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
