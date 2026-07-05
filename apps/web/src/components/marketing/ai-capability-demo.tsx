'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Check,
  Brain,
  Sparkles,
  CloudSun,
  TrafficCone,
  Users,
  Clock,
  MapPin,
  Camera,
  Utensils,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { StaggerGroup, StaggerItem } from './scroll-reveal'

interface AICapabilityDemoProps {
  title: string
  subtitle: string
}

const EASE = [0.16, 1, 0.3, 1] as const

const STEPS = [
  { label: '筛选符合偏好的景点', value: 100 },
  { label: '结合天气避开雨天户外', value: 100 },
  { label: '贪心算法最小化交通耗时', value: 92 },
  { label: '检测时间冲突自动调整', value: 100 },
]

const CONSTRAINTS = [
  { icon: Sparkles, label: '用户偏好' },
  { icon: CloudSun, label: '实时天气' },
  { icon: TrafficCone, label: '交通态势' },
  { icon: Users, label: '人流热度' },
  { icon: Clock, label: '时序约束' },
]

const TIMELINE = [
  { icon: Camera, name: '西湖断桥', time: '09:00', tag: '景点', color: 'text-azure' },
  { icon: Utensils, name: '楼外楼', time: '12:30', tag: '美食', color: 'text-gray-700 dark:text-gray-300' },
  { icon: MapPin, name: '灵隐寺', time: '14:30', tag: '景点', color: 'text-azure' },
]

/**
 * 单条进度条递增组件（逻辑保持不变）
 */
function AnimatedProgress({
  target,
  delay,
  index,
}: {
  target: number
  delay: number
  index: number
}) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) {
      setValue(target)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const startTime = performance.now()
            const duration = 1200
            const tick = (now: number) => {
              const progress = Math.min((now - startTime) / duration, 1)
              const eased =
                progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
              setValue(target * eased)
              if (progress < 1) requestAnimationFrame(tick)
              else setValue(target)
            }
            setTimeout(() => requestAnimationFrame(tick), delay)
          }
        })
      },
      { threshold: 0.4 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [target, delay])

  return (
    <div ref={ref}>
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-azure-muted text-azure">
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className="text-body text-ink-primary">
          <span className="mr-2 font-mono text-caption text-ink-tertiary">
            {String(index + 1).padStart(2, '0')}
          </span>
          {STEPS[index].label}
        </span>
        <span className="ml-auto font-mono text-caption text-ink-quaternary">
          {Math.round(value)}%
        </span>
      </div>
      <Progress value={value} className="ml-9 mt-2 h-1.5 bg-surface-muted" />
    </div>
  )
}

/**
 * AI 能力演示区 — 3 层玻璃面板视差
 * 底层：数据矩阵（CONSTRAINTS 网格） translateZ(-80px)
 * 中层：推理进度条面板 translateZ(0)
 * 前层：结果 timeline 卡片 translateZ(60px)
 * 滚动时各层独立视差位移
 */
export function AICapabilityDemo({ title, subtitle }: AICapabilityDemoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // 三层视差位移
  const backY = useTransform(scrollYProgress, [0, 1], [80, -80])
  const midY = useTransform(scrollYProgress, [0, 1], [40, -40])
  const frontY = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <section
      id="ai-demo"
      ref={ref}
      className="relative overflow-hidden bg-surface-canvas px-4 py-30"
    >
      {/* 深色背景层 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-surface-canvas via-surface-sunken to-surface-canvas" />

      {/* 顶部微妙光晕（中性灰） */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-10 h-[280px] w-[680px] max-w-[90vw] -translate-x-1/2 rounded-full bg-black/[0.02] blur-[120px]"
      />

      <div className="relative mx-auto max-w-[1100px]">
        {/* —— 标题区 —— */}
        <StaggerGroup className="mx-auto max-w-2xl text-center" stagger={0.12}>
          <StaggerItem>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-azure/30 bg-azure-muted px-4 py-1.5 text-overline text-azure backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              AI ENGINE
            </span>
          </StaggerItem>
          <StaggerItem>
            <h2
              className="font-appleDisplay mt-6 text-h1 text-ink-primary"
            >
              {title}
            </h2>
          </StaggerItem>
          <StaggerItem>
            <div className="mx-auto mt-6 h-[3px] w-16 rounded-full bg-gradient-to-r from-azure via-azure/60 to-azure" />
          </StaggerItem>
          <StaggerItem>
            <p className="mt-6 text-body-lg text-ink-tertiary">{subtitle}</p>
          </StaggerItem>
        </StaggerGroup>

        {/* —— 3 层视差玻璃面板 —— */}
        <div className="perspective-2000 relative mt-16">
          {/* 底层：约束条件矩阵 */}
          <motion.div
            style={{ y: backY, translateZ: -80 }}
            className="absolute inset-x-0 top-8 flex flex-wrap items-center justify-center gap-3 opacity-50"
          >
            {CONSTRAINTS.map((c) => {
              const Icon = c.icon
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/60 px-3 py-1.5 text-caption text-ink-tertiary backdrop-blur-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-azure" />
                  {c.label}
                </span>
              )
            })}
          </motion.div>

          {/* 中层：推理进度面板 */}
          <motion.div
            initial={{ opacity: 0, y: 32, rotateX: -6 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            style={{ y: midY }}
            className="relative preserve-3d overflow-hidden rounded-2xl border border-border bg-surface-elevated/80 p-8 shadow-3d-deep backdrop-blur-md sm:p-10"
          >
            {/* 面板头部 */}
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-azure-muted text-azure">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="text-body font-medium text-ink-primary">
                  AI 正在为你规划行程
                </div>
                <div className="text-caption text-ink-quaternary">
                  基于偏好 / 天气 / 交通 / 时序约束
                </div>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-azure-muted px-3 py-1 text-caption text-azure">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-azure"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: EASE }}
                />
                推理中
              </span>
            </div>

            {/* 步骤列表 */}
            <div className="pt-6">
              <StaggerGroup className="space-y-5" stagger={0.2}>
                {STEPS.map((step, idx) => (
                  <StaggerItem key={step.label}>
                    <AnimatedProgress
                      target={step.value}
                      delay={idx * 200}
                      index={idx}
                    />
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </motion.div>

          {/* 前层：结果 timeline 浮卡（右下角） */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotateY: 8 }}
            whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
            style={{ y: frontY, translateZ: 60 }}
            className="preserve-3d relative mt-6 ml-auto w-full max-w-md rounded-2xl border border-azure/30 bg-surface-elevated p-6 shadow-azure"
          >
            <div className="mb-4 flex items-center gap-2">
              <Check className="h-4 w-4 text-azure" />
              <span className="text-body-sm font-medium text-ink-secondary">
                生成结果 · 杭州一日游
              </span>
              <span className="ml-auto rounded-full bg-azure-muted px-2.5 py-0.5 text-caption text-azure">
                松弛版
              </span>
            </div>

            {/* 迷你时间轴 */}
            <div className="relative pl-2">
              <div className="absolute bottom-3 left-[18px] top-3 w-px bg-gradient-to-b from-azure/60 via-azure/30 to-transparent" />
              <ul className="space-y-4">
                {TIMELINE.map((node) => {
                  const Icon = node.icon
                  return (
                    <li key={node.name} className="relative flex items-center gap-3 pl-6">
                      <span className="absolute left-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-azure bg-surface-elevated">
                        <Icon className={`h-2 w-2 ${node.color}`} />
                      </span>
                      <span className="text-body-sm text-ink-primary">
                        {node.name}
                      </span>
                      <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-caption text-ink-quaternary">
                        {node.tag}
                      </span>
                      <span className="ml-auto font-mono text-caption text-azure">
                        {node.time}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
