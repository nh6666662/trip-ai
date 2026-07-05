'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassStatProps {
  /** 大数字 / 主值 */
  value: ReactNode
  /** 小标签 */
  label: string
  /** 可选的图标 */
  icon?: ReactNode
  className?: string
}

/**
 * GlassStat — Apple 风格数据统计单元
 * 大数字 + 小标签，常用于 profile 页面的 stats 网格
 */
export function GlassStat({ value, label, icon, className }: GlassStatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="font-appleDisplay text-3xl font-semibold tracking-tight text-gray-700 dark:text-gray-900">
          {value}
        </span>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </span>
    </div>
  )
}
