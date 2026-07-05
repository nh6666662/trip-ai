import Link from 'next/link'
import { Sparkles } from 'lucide-react'

interface SiteFooterProps {
  appName: string
  tagline: string
}

interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

/**
 * 页脚 — 深色背景，三列链接 + 版权 + 点阵纹理装饰
 */
export function SiteFooter({ appName, tagline }: SiteFooterProps) {
  const columns: FooterColumn[] = [
    {
      title: '产品',
      links: [
        { label: '行程规划', href: '/trips' },
        { label: 'AI 助手', href: '/ai-assistant' },
        { label: '社区', href: '/community' },
      ],
    },
    {
      title: '资源',
      links: [
        { label: '使用指南', href: '#' },
        { label: 'API 文档', href: '#' },
        { label: '帮助中心', href: '#' },
      ],
    },
    {
      title: '公司',
      links: [
        { label: '关于我们', href: '#' },
        { label: '联系我们', href: '#' },
        { label: '隐私政策', href: '#' },
      ],
    },
  ]

  return (
    <footer className="relative overflow-hidden bg-[#1F1611] px-4 py-20 dark:bg-[#0A0805]">
      <div className="relative mx-auto max-w-[1200px]">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* 品牌列 */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-azure text-white">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-azure" />
              </div>
              <span className="font-appleDisplay text-h4 font-semibold text-[#FFF8F2]">
                {appName}
              </span>
            </div>
            <p className="mt-3 max-w-xs text-body-sm text-white/70">
              {tagline}
            </p>
          </div>

          {/* 链接列 */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-body-sm font-semibold text-[#FFF8F2]">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-white/60 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 版权行 */}
        <div className="mt-12 border-t border-white/15 pt-6 text-center text-caption text-white/50">
          <p>© 2026 {appName}. All rights reserved. · Crafted with intention.</p>
        </div>
      </div>
    </footer>
  )
}
