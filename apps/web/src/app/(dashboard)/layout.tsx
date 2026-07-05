import { DashboardNav } from '@/components/dashboard-nav'
import { PageTransition } from '@/components/page-transition'

/**
 * 体验平台布局 — 侧边导航 + 主内容区
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen apple-bg">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
