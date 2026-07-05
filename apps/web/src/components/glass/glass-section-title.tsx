'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassSectionTitleProps {
  /** 标题文案 */
  children: ReactNode
  /** 可选的右侧操作区（如"查看全部"） */
  action?: ReactNode
  className?: string
}

/**
 * GlassSectionTitle — Apple 风格章节标题
 * 左侧 2px 短竖线 + 大写小字标签，克制留白
 */
export function GlassSectionTitle({ children, action, className }: GlassSectionTitleProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-2.5">
        <span className="h-3.5 w-0.5 rounded-full bg-azure" aria-hidden />
        <h3 className="font-appleDisplay text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          {children}
        </h3>
      </div>
      {action}
    </div>
  )
}
