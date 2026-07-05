'use client'

import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

/**
 * 深色模式 Hook
 * 管理 light/dark/system 三种模式，持久化到 cookie
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // 从 cookie 读取保存的主题
  useEffect(() => {
    const saved = document.cookie.match(/theme=(light|dark|system)/)?.[1] as Theme
    if (saved) setThemeState(saved)
  }, [])

  // 应用主题到 document
  useEffect(() => {
    const root = document.documentElement
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    root.classList.toggle('dark', isDark)
    setResolvedTheme(isDark ? 'dark' : 'light')
  }, [theme])

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
      setResolvedTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.cookie = `theme=${t};path=/;max-age=${365 * 86400}`
  }, [])

  return { theme, resolvedTheme, setTheme }
}
