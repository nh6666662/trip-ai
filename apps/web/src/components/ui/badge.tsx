import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-overline font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-muted',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-accent text-white',
        gold:
          'border-transparent bg-gold text-white',
        accent:
          'border-transparent bg-accent-muted text-accent',
        success:
          'border-transparent bg-success/10 text-success',
        warning:
          'border-transparent bg-warning/10 text-warning',
        destructive:
          'border-transparent bg-danger/10 text-danger',
        outline: 'text-ink-secondary border-border',
        muted: 'border-transparent bg-surface-muted text-ink-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
