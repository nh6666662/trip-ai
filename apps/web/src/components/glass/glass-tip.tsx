'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassTipProps {
  /** 左侧图标 */
  icon?: ReactNode
  /** 主文案（短） */
  label: string
  /** 展开后的详情 */
  detail?: ReactNode
  /** 颜色基调 */
  tone?: 'default' | 'azure' | 'amber' | 'coral' | 'mint'
  /** 是否默认展开 */
  defaultOpen?: boolean
  className?: string
}

const toneClass = {
  default: 'text-gray-600',
  azure: 'text-azure',
  amber: 'text-amberCaution',
  coral: 'text-coralWarn',
  mint: 'text-mintOk',
}

const toneBgClass = {
  default: 'bg-gray-100',
  azure: 'bg-azure-muted',
  amber: 'bg-amberCaution-muted',
  coral: 'bg-coralWarn-muted',
  mint: 'bg-mintOk-muted',
}

/**
 * GlassTip — Apple 风格小贴士胶囊
 * 默认折叠显示短文案，点击展开详情
 * 用于 trips 详情页的"出行提示"重构
 */
export function GlassTip({
  icon,
  label,
  detail,
  tone = 'default',
  defaultOpen = false,
  className,
}: GlassTipProps) {
  const [open, setOpen] = useState(defaultOpen)
  const hasDetail = Boolean(detail)

  return (
    <div
      className={cn(
        'glass-subtle rounded-2xl transition-all duration-300 ease-out',
        open && 'rounded-2xl',
        hasDetail && 'hover:bg-accent-muted hover:text-accent hover:translate-x-1',
        className
      )}
    >
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => hasDetail && setOpen(v => !v)}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-300',
          hasDetail && 'cursor-pointer hover:bg-white/40 dark:hover:bg-white/5'
        )}
      >
        {icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', toneBgClass[tone], toneClass[tone])}>
            {icon}
          </span>
        )}
        <span className={cn('flex-1 text-sm font-medium', toneClass[tone])}>{label}</span>
        {hasDetail && (
          <ChevronDown
            className={cn('h-4 w-4 text-gray-400 transition-transform duration-300 hover:text-azure', open && 'rotate-180')}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && hasDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-200/50 px-4 py-3 text-sm text-gray-600">
              {detail}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
