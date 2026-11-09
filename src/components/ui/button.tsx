import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default: 'bg-brand text-on-brand shadow-xs hover:bg-brand-strong',
        destructive: 'bg-danger text-white shadow-xs hover:bg-danger/90 focus-visible:ring-danger/30',
        outline: 'border border-line-strong bg-surface text-ink shadow-xs hover:bg-surface-2 hover:border-ink-4/60',
        secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
        soft: 'bg-brand-soft text-brand-ink hover:bg-brand-soft/70 dark:hover:bg-brand-soft/80',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        link: 'text-brand-ink underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-10 px-4 has-[>svg]:px-3.5',
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 rounded-md gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5',
        lg: 'h-12 rounded-xl px-6 text-[15px] has-[>svg]:px-5',
        icon: 'size-10',
        'icon-xs': "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
