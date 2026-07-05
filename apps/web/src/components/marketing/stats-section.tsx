'use client'

import { motion } from 'framer-motion'
import { CountUp } from './count-up'
import { StaggerGroup, StaggerItem } from './scroll-reveal'
import { TrendingUp, MapPin, Clock, Sparkles } from 'lucide-react'

interface StatsSectionProps {
  title: string
}

interface Stat {
  end: number
  suffix: string
  label: string
  caption: string
  icon: typeof TrendingUp
  /** 进度条目标百分比 0-100 */
  progress: number
}

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * StatsSection — Sunset Alpenglow 数据驱动屏
 * 暖橙渐变背景 + 三列数字 + 动态进度条 + 流动数据线
 * 无 3D 重叠，用进度条动画与流动线条营造动感
 */
export function StatsSection({ title }: StatsSectionProps) {
  const stats: Stat[] = [
    { end: 10, suffix: '万+', label: '景点数据', caption: 'POI 覆盖全国 800+ 城市', icon: MapPin, progress: 92 },
    { end: 98, suffix: '%', label: '行程采纳率', caption: '基于用户反馈持续优化', icon: TrendingUp, progress: 98 },
    { end: 24, suffix: 'h', label: '实时更新', caption: '天气 / 交通 / 人流 / 预警', icon: Clock, progress: 100 },
  ]

  return (
    <section className="relative overflow-hidden bg-surface-canvas px-4 py-32 dark:bg-[#0A0805]">
      <div className="relative mx-auto max-w-[1200px]">
        {/* 标题 */}
        <StaggerGroup className="text-center" stagger={0.15}>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-muted px-4 py-1.5 text-overline text-accent backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              DATA · 数据驱动
            </span>
          </StaggerItem>
          <StaggerItem>
            <h2 className="font-appleDisplay mt-5 text-h2 text-ink-primary">{title}</h2>
          </StaggerItem>
          <StaggerItem>
            <div className="ornament-line mx-auto mt-5 w-24" />
          </StaggerItem>
        </StaggerGroup>

        {/* 三列数字卡片 */}
        <StaggerGroup
          className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3"
          stagger={0.18}
        >
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <StaggerItem key={stat.label}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="group relative overflow-hidden rounded-2xl border border-accent/15 bg-white/60 p-8 shadow-md backdrop-blur-md transition-all hover:shadow-accent dark:border-accent/25 dark:bg-[#2A1F18]/60"
                >
                  {/* 图标圆 */}
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-muted text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* 数字 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="font-appleDisplay text-6xl font-semibold leading-none text-gradient"
                    style={{ filter: 'drop-shadow(0 4px 16px rgba(255, 107, 53, 0.3))' }}
                  >
                    <CountUp end={stat.end} suffix={stat.suffix} />
                  </motion.div>

                  {/* 标签 */}
                  <div className="mt-4 font-appleDisplay text-h4 text-ink-primary">
                    {stat.label}
                  </div>
                  <p className="mt-1.5 text-body-sm text-ink-tertiary">
                    {stat.caption}
                  </p>

                  {/* 动态进度条 */}
                  <div className="mt-6">
                    <div className="mb-1.5 flex items-center justify-between text-caption">
                      <span className="text-ink-quaternary">覆盖率</span>
                      <span className="font-mono text-accent">{stat.progress}%</span>
                    </div>
                    <div className="relative h-1.5 overflow-hidden rounded-full bg-accent/10">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${stat.progress}%` }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          background:
                            'linear-gradient(90deg, #FF6B35 0%, #FF9F0A 100%)',
                          boxShadow: '0 0 12px rgba(255, 107, 53, 0.5)',
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            )
          })}
        </StaggerGroup>

        {/* 流动数据线装饰 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="relative mt-16 h-16"
          aria-hidden
        >
          <svg
            viewBox="0 0 1200 60"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="stats-flow-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF6B35" stopOpacity="0" />
                <stop offset="50%" stopColor="#FF6B35" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30"
              fill="none"
              stroke="url(#stats-flow-line)"
              strokeWidth="2"
              strokeDasharray="8 6"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-28"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </path>
            <path
              d="M0,30 Q150,50 300,30 T600,30 T900,30 T1200,30"
              fill="none"
              stroke="url(#stats-flow-line)"
              strokeWidth="1.5"
              strokeDasharray="4 8"
              opacity="0.6"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="24"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        </motion.div>
      </div>
    </section>
  )
}
