'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Sun, Moon } from 'lucide-react'
import { useSession, useTheme } from '@/lib/hooks'

interface NavbarProps {
  appName: string
  navHome: string
  navFeatures: string
  navAbout: string
  ctaPrimary: string
}

/**
 * 顶部固定玻璃质感导航栏
 * - 左：Logo（Sparkles + 旅智 TripAI）
 * - 中右：桌面端导航链接
 * - 右：accent CTA（未登录跳 /login，已登录跳 /trips）
 * - 滚动方向感知：向下滚动隐藏，向上滚动显示；顶部时背景更通透
 */
export function Navbar({
  appName,
  navHome,
  navFeatures,
  navAbout,
  ctaPrimary,
}: NavbarProps) {
  const { user } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [hidden, setHidden] = useState(false)
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setAtTop(y < 24)
      // 顶部不隐藏；向下滚动且超过 120px 时隐藏，向上滚动时显示
      if (y < 120) {
        setHidden(false)
      } else if (y > lastY + 8) {
        setHidden(true)
      } else if (y < lastY - 8) {
        setHidden(false)
      }
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: navHome, href: '/' },
    { label: navFeatures, href: '#features' },
    { label: navAbout, href: '#ai-demo' },
  ]

  return (
    <header
      className={`glass fixed inset-x-0 top-0 z-50 h-16 transition-all duration-300 ease-out-expo ${
        atTop ? 'border-b border-transparent' : 'border-b border-border'
      } ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-5">
        {/* Logo — 带 coral 圆点 */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-azure text-white shadow-azure">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-azure ring-2 ring-surface-canvas" />
          </div>
          <span className="font-appleDisplay text-h4 font-semibold text-ink-primary">
            {appName}
          </span>
        </Link>

        {/* 桌面端导航链接 */}
        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-body-sm text-ink-secondary transition-colors hover:text-azure"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-surface-muted hover:text-ink-primary"
            aria-label="切换主题"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <Link
            href={user ? '/trips' : '/login'}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-azure px-5 text-body-sm font-medium text-white shadow-azure transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            {ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
