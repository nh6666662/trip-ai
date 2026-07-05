'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** 玻璃强度：default 普通玻璃，strong 强玻璃（hero），subtle 弱玻璃（tip） */
  variant?: 'default' | 'strong' | 'subtle'
  /** 是否启用 hover 上浮效果 */
  hover?: boolean
  /** 内边距：default p-6，compact p-4，none p-0 */
  padding?: 'default' | 'compact' | 'none'
}

const variantClass = {
  default: 'glass',
  strong: 'glass-strong',
  subtle: 'glass-subtle',
}

const paddingClass = {
  default: 'p-6',
  compact: 'p-4',
  none: '',
}

/**
 * GlassCard — Apple Liquid Glass 基础容器
 * 三种强度：default / strong / subtle
 * 可选 hover 上浮效果（translate-y + shadow 加深 + 边框变亮）
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', hover = false, padding = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl',
          variantClass[variant],
          paddingClass[padding],
          hover &&
            'transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-glass-lg',
          className
        )}
        {...props}
      />
    )
  }
)
GlassCard.displayName = 'GlassCard'
