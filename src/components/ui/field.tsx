'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-[10px] border border-line-strong bg-canvas px-3 text-sm text-ink shadow-xs transition-colors',
        'placeholder:text-subtle hover:border-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10',
        'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-[10px] border border-line-strong bg-canvas px-3 py-2.5 text-sm text-ink shadow-xs transition-colors',
      'placeholder:text-subtle hover:border-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10',
      'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted resize-y min-h-[88px]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'h-10 w-full appearance-none rounded-[10px] border border-line-strong bg-canvas px-3 pr-9 text-sm text-ink shadow-xs transition-colors',
        'hover:border-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10',
        'disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = 'Select';

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('text-[13px] font-medium text-ink-soft', className)} {...props}>
      {children}
      {/* L'astérisque est décorative : `required` porte déjà l'information. */}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label || hint ? (
        <div className="flex items-baseline justify-between gap-2">
          {label ? (
            <Label htmlFor={htmlFor} required={required}>
              {label}
            </Label>
          ) : (
            <span />
          )}
          {hint ? <span className="text-[12px] text-subtle">{hint}</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
