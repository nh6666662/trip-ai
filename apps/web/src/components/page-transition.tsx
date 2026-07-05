'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * 页面切换过渡动画容器
 *
 * 监听路由变化，在 pathname 改变时触发淡入 + 轻微上浮动画。
 * 用 AnimatePresence mode="wait" 确保旧页面先退场再进场。
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * 加载骨架屏 — 在数据加载时显示
 */
export function PageSkeleton({ variant = 'default' }: { variant?: 'default' | 'card' | 'list' }) {
  if (variant === 'card') {
    return (
      <div className="space-y-4 p-6">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-muted" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        className="h-8 w-8 rounded-full border-2 border-accent/30 border-t-accent"
      />
    </div>
  )
}
