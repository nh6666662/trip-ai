'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPinned, Bot, Users, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTranslations } from 'next-intl'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/trips', icon: MapPinned, key: 'trips' },
  { href: '/ai-assistant', icon: Bot, key: 'aiAssistant' },
  { href: '/community', icon: Users, key: 'community' },
  { href: '/profile', icon: User, key: 'profile' },
] as const

export function DashboardNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  return (
    <>
      {/* 桌面侧边栏 */}
      <aside className="hidden w-[260px] shrink-0 border-r border-accent/10 bg-surface-elevated/60 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-accent/10 px-6">
          <Sparkles className="h-5 w-5 text-azure" />
          <span className="text-h4 font-semibold text-azure">
            旅智 TripAI
          </span>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-body transition-all',
                      active
                        ? 'bg-accent-muted font-medium text-accent shadow-sm'
                        : 'text-ink-secondary hover:bg-accent-muted hover:text-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.key)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        {/* 底部主题切换入口 */}
        <div className="border-t border-accent/10 p-4">
          <ThemeToggle />
        </div>
      </aside>

      {/* 移动端底部导航 */}
      <nav className="glass-navbar fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-accent/10 px-2 py-2 lg:hidden">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 text-caption transition-colors',
                  active ? 'text-accent' : 'text-ink-quaternary'
                )}
            >
              <Icon className="h-5 w-5" />
              {t(item.key)}
            </Link>
          )
        })}
        {/* 移动端主题切换入口 */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <ThemeToggle className="h-8 w-8" />
          <span className="text-caption text-ink-quaternary">主题</span>
        </div>
      </nav>
    </>
  )
}
