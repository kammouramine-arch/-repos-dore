'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0 select-none active:translate-y-px',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-white shadow-xs hover:bg-accent-hover',
        secondary:
          'bg-canvas text-ink border border-line-strong shadow-xs hover:bg-surface hover:border-line-strong',
        ghost: 'text-ink-soft hover:bg-surface-2',
        subtle: 'bg-surface-2 text-ink hover:bg-line',
        danger: 'bg-danger text-white shadow-xs hover:brightness-95',
        success: 'bg-success text-white shadow-xs hover:brightness-95',
        link: 'text-accent underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 rounded-[8px] px-3 text-[13px]',
        md: 'h-10 rounded-[10px] px-4 text-sm',
        lg: 'h-12 rounded-[12px] px-6 text-[15px]',
        icon: 'h-10 w-10 rounded-[10px]',
        iconSm: 'h-8 w-8 rounded-[8px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
