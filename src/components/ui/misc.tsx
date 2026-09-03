'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { cn } from '@/lib/utils';

export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'data-[state=checked]:bg-accent data-[state=unchecked]:bg-line-strong disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center gap-1 rounded-[10px] border border-line bg-surface p-1',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-[7px] px-3 py-1.5 text-[13px] font-medium text-muted transition-all',
        'hover:text-ink data-[state=active]:bg-canvas data-[state=active]:text-ink data-[state=active]:shadow-xs',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-5 animate-fade', className)} {...props} />;
}

export function Separator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      className={cn(
        'bg-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-[8px] bg-surface-2', className)}
      aria-hidden
      {...props}
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent"
        style={{ animation: 'devisia-shimmer 1.6s infinite' }}
      />
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
