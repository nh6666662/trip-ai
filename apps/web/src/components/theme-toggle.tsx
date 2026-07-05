'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/hooks'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  /** 附加类名以适配不同位置（如 navbar 用 rounded-lg，dashboard 侧栏用 rounded-full） */
  className?: string
}

/**
 * ThemeToggle — 可复用的主题切换按钮
 * 亮色显示 Moon（点击切到暗色），暗色显示 Sun（点击切到亮色）
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full text-ink-tertiary transition-colors hover:bg-accent-muted hover:text-accent',
        className
      )}
      aria-label="切换主题"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}
