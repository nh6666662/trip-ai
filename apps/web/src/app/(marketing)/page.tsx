/**
 * 官网首页 — Server Component (ISR)
 * 由 getTranslations 注入多语言文案，Hero 单独为客户端组件（含 framer-motion 动画）
 */
import { getTranslations } from 'next-intl/server'
import { Navbar } from '@/components/marketing/navbar'
import { Hero } from '@/components/marketing/hero'
import { FeatureShowcase } from '@/components/marketing/feature-showcase'
import { AICapabilityDemo } from '@/components/marketing/ai-capability-demo'
import { StatsSection } from '@/components/marketing/stats-section'
import { CTASection } from '@/components/marketing/cta-section'
import { SiteFooter } from '@/components/marketing/site-footer'

// 每小时 ISR 重新生成
export const revalidate = 3600

export default async function LandingPage() {
  const t = await getTranslations('marketing')
  const tCommon = await getTranslations('common')
  const tNav = await getTranslations('nav')

  return (
    <main className="min-h-screen">
      {/* 顶部固定玻璃导航栏 */}
      <Navbar
        appName={tCommon('appName')}
        navHome={tNav('home')}
        navFeatures="功能"
        navAbout="关于"
        ctaPrimary={t('ctaPrimary')}
      />

      {/* Hero 区（100vh，渐变背景 + 错峰入场动画） */}
      <Hero
        badge={t('badge')}
        title={t('heroTitle')}
        subtitle={t('heroSubtitle')}
        ctaPrimary={t('ctaPrimary')}
        ctaSecondary={t('ctaSecondary')}
      />

      {/* 核心功能三卡片 */}
      <FeatureShowcase
        title={t('featuresTitle')}
        subtitle={t('featuresSubtitle')}
        feature1Title={t('feature1Title')}
        feature1Desc={t('feature1Desc')}
        feature2Title={t('feature2Title')}
        feature2Desc={t('feature2Desc')}
        feature3Title={t('feature3Title')}
        feature3Desc={t('feature3Desc')}
      />

      {/* AI 能力演示（深色区） */}
      <AICapabilityDemo
        title={t('aiDemoTitle')}
        subtitle={t('aiDemoSubtitle')}
      />

      {/* 数据统计 */}
      <StatsSection title={t('statsTitle')} />

      {/* CTA 行动召唤 */}
      <CTASection
        title={t('ctaTitle')}
        subtitle={t('ctaSubtitle')}
        ctaPrimary={t('ctaPrimary')}
      />

      {/* 页脚 */}
      <SiteFooter
        appName={tCommon('appName')}
        tagline={tCommon('tagline')}
      />
    </main>
  )
}
