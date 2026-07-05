'use client'

import { Compass, ShieldCheck, Camera, MapPin, CloudRain, Sun, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { StaggerGroup, StaggerItem } from './scroll-reveal'
import { PolaroidFrame, WeatherSplitIcon } from './travel-decorations'
import { useTilt } from './use-tilt'

interface FeatureShowcaseProps {
  title: string
  subtitle: string
  feature1Title: string
  feature1Desc: string
  feature2Title: string
  feature2Desc: string
  feature3Title: string
  feature3Desc: string
}

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Feature 1 — AI 行程规划
 * 视觉语言：大型左侧编辑式卡片，3D 鼠标倾斜，右侧嵌入迷你 timeline 预览
 */
function FeatureEditorial({
  title,
  desc,
}: {
  title: string
  desc: string
}) {
  const tilt = useTilt({ max: 6, perspective: 1400 })
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      {/* 左：文案 + 编号 */}
      <div className="lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div className="flex items-center gap-3">
            <span className="font-appleDisplay text-h2 text-azure">01</span>
            <div className="h-px flex-1 bg-gradient-to-r from-azure/60 to-transparent" />
            <Compass className="h-5 w-5 text-azure" />
          </div>
          <h3 className="font-appleDisplay mt-4 text-h2 text-ink-primary">{title}</h3>
          <p className="mt-4 text-body-lg leading-relaxed text-ink-tertiary">{desc}</p>
        </motion.div>
      </div>

      {/* 右：3D 倾斜卡片，内嵌迷你 timeline */}
      <div className="lg:col-span-7">
        <motion.div
          initial={{ opacity: 0, y: 32, rotateX: -8 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={tilt.style}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}
          className="perspective-1400 relative overflow-hidden rounded-2xl border border-accent/15 bg-surface-elevated p-8 shadow-3d-deep dark:border-accent/25 dark:bg-[#1F1611]"
        >
          {/* 卡片头 */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-azure-muted text-azure">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="text-body-sm font-medium text-ink-primary">杭州 · 一日游</div>
                <div className="text-caption text-ink-quaternary">松弛版 · AI 生成</div>
              </div>
            </div>
            <span className="rounded-full bg-azure/10 px-2.5 py-1 text-caption text-azure">已采纳</span>
          </div>

          {/* 迷你 timeline */}
          <div className="relative mt-6 pl-2">
            <div className="absolute bottom-3 left-[18px] top-3 w-px bg-gradient-to-b from-azure/60 via-azure/30 to-transparent" />
            <ul className="space-y-3">
              {[
                { icon: Camera, name: '西湖断桥', time: '09:00', tag: '景点' },
                { icon: MapPin, name: '楼外楼', time: '12:30', tag: '美食' },
                { icon: Camera, name: '灵隐寺', time: '14:30', tag: '景点' },
              ].map((node) => {
                const Icon = node.icon
                return (
                  <li key={node.name} className="relative flex items-center gap-3 pl-6">
                    <span className="absolute left-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-azure bg-surface-elevated">
                      <Icon className="h-2 w-2 text-azure" />
                    </span>
                    <span className="text-body-sm text-ink-primary">{node.name}</span>
                    <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-caption text-ink-quaternary">{node.tag}</span>
                    <span className="ml-auto font-mono text-caption text-azure">{node.time}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 卡片底部：可拖拽提示 */}
          <div className="relative mt-5 flex items-center gap-2 border-t border-border-light pt-4 text-caption text-ink-quaternary">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-azure" />
            支持拖拽调整顺序 · AI 实时校验时间冲突
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Feature 2 — 实时动态调整
 * 视觉语言：右侧文案 + 左侧双栏气象分屏（晴 / 雨），中间调整箭头
 */
function FeatureSplitScreen({
  title,
  desc,
}: {
  title: string
  desc: string
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      {/* 左：双栏分屏卡片 */}
      <div className="order-2 lg:order-1 lg:col-span-7">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative overflow-hidden rounded-2xl border border-accent/15 bg-surface-elevated shadow-3d-deep dark:border-accent/25 dark:bg-[#1F1611]"
        >
          {/* 双栏背景 */}
          <div className="grid grid-cols-2">
            {/* 左半：晴天 */}
            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-accent-muted to-accent/5 p-6 dark:from-[#2A1F18] dark:to-[#1F1611]">
              <div className="relative">
                <Sun className="h-8 w-8 text-accent" />
                <div className="mt-3 text-overline text-accent">原计划 · 晴</div>
                <div className="mt-1 font-appleDisplay text-h4 text-ink-primary">西湖断桥</div>
                <div className="mt-1 text-caption text-ink-tertiary">09:00 · 户外</div>
              </div>
            </div>
            {/* 右半：雨天 */}
            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-azure-muted to-azure/10 p-6">
              <div className="relative">
                <CloudRain className="h-8 w-8 text-azure" />
                <div className="mt-3 text-overline text-azure">天气预警 · 雨</div>
                <div className="mt-1 font-appleDisplay text-h4 text-ink-primary">浙江省博物馆</div>
                <div className="mt-1 text-caption text-ink-tertiary">09:00 · 室内替代</div>
              </div>
            </div>
          </div>

          {/* 中间分隔 + 调整箭头 */}
          <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/30 bg-[#1F1611] shadow-md">
            <motion.div
              animate={{ x: [-3, 3, -3] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: EASE }}
            >
              <ArrowRight className="h-5 w-5 text-azure" />
            </motion.div>
          </div>

          {/* 底部状态条 */}
          <div className="flex items-center justify-between border-t border-border-light px-6 py-3 text-caption">
            <span className="flex items-center gap-2 text-ink-tertiary">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-azure" />
              实时监测 · 天气 / 交通 / 人流
            </span>
            <span className="font-mono text-ink-quaternary">12 min ago</span>
          </div>
        </motion.div>
      </div>

      {/* 右：文案 */}
      <div className="order-1 lg:order-2 lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div className="flex items-center gap-3">
            <span className="font-appleDisplay text-h2 text-azure">02</span>
            <div className="h-px flex-1 bg-gradient-to-r from-azure/60 to-transparent" />
            <WeatherSplitIcon className="h-6 w-6 text-ink-tertiary" />
          </div>
          <h3 className="font-appleDisplay mt-4 text-h2 text-ink-primary">{title}</h3>
          <p className="mt-4 text-body-lg leading-relaxed text-ink-tertiary">{desc}</p>
        </motion.div>
      </div>
    </div>
  )
}

/**
 * Feature 3 — UGC 社区分享
 * 视觉语言：左侧文案 + 右侧三张旋转角度不同的 Polaroid 拼贴，悬停展开
 */
function FeaturePolaroidStack({
  title,
  desc,
}: {
  title: string
  desc: string
}) {
  const polaroids = [
    {
      rotate: -8,
      z: 30,
      x: -20,
      y: 10,
      title: '西湖日落',
      author: '@voyager_lin',
      gradient: 'from-accent/60 to-accent-muted',
    },
    {
      rotate: 4,
      z: 50,
      x: 20,
      y: -10,
      title: '灵隐晨雾',
      author: '@trip_mind',
      gradient: 'from-accent-muted to-accent/20',
    },
    {
      rotate: -3,
      z: 10,
      x: 40,
      y: 30,
      title: '楼外楼 · 醉鸡',
      author: '@foodie_zh',
      gradient: 'from-accent-muted to-accent/60',
    },
  ]

  return (
    <div className="grid items-center gap-10 lg:grid-cols-12">
      {/* 左：文案 */}
      <div className="lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <div className="flex items-center gap-3">
            <span className="font-appleDisplay text-h2 text-accent">03</span>
            <div className="h-px flex-1 bg-gradient-to-r from-accent/40 to-transparent" />
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <h3 className="font-appleDisplay mt-4 text-h2 text-ink-primary">{title}</h3>
          <p className="mt-4 text-body-lg leading-relaxed text-ink-tertiary">{desc}</p>

          {/* 数据小标签 */}
          <div className="mt-6 flex flex-wrap gap-2">
            {['地理围栏验证', '多源交叉', '数据回流模型'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-surface-elevated px-3 py-1 text-caption text-ink-tertiary"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 右：Polaroid 拼贴 */}
      <div className="lg:col-span-7">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="perspective-1200 relative h-80"
        >
          {polaroids.map((p) => (
            <motion.div
              key={p.title}
              className="absolute left-1/2 top-1/2"
              style={{
                translateX: '-50%',
                translateY: '-50%',
                translateZ: p.z,
                rotate: p.rotate,
                x: p.x,
                y: p.y,
              }}
              whileHover={{
                scale: 1.06,
                rotate: 0,
                translateZ: 80,
                transition: { duration: 0.4, ease: EASE },
                zIndex: 50,
              }}
            >
              <PolaroidFrame className="w-56">
                {/* 模拟照片 */}
                <div className={`relative h-40 overflow-hidden rounded-sm bg-gradient-to-br ${p.gradient}`}>
                  <Camera className="absolute bottom-2 right-2 h-4 w-4 text-ink-primary/40" />
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="font-appleDisplay text-body-sm text-ink-primary">{p.title}</span>
                  <span className="text-caption text-ink-quaternary">{p.author}</span>
                </div>
              </PolaroidFrame>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/**
 * FeatureShowcase — 三个非对称编辑式版面
 * - 01 AI 行程规划：左文右 3D 倾斜卡（含 timeline）
 * - 02 实时动态调整：左双栏分屏 右文案
 * - 03 UGC 社区分享：左文案 右 Polaroid 拼贴
 */
export function FeatureShowcase({
  title,
  subtitle,
  feature1Title,
  feature1Desc,
  feature2Title,
  feature2Desc,
  feature3Title,
  feature3Desc,
}: FeatureShowcaseProps) {
  return (
    <section id="features" className="relative overflow-hidden bg-surface-canvas px-4 py-30 dark:bg-[#0A0805]">
      <div className="relative mx-auto max-w-[1200px]">
        {/* 标题区 */}
        <StaggerGroup className="mx-auto max-w-2xl text-center" stagger={0.15}>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-muted/60 px-4 py-1.5 text-overline text-accent backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-azure" />
              CORE FEATURES
            </span>
          </StaggerItem>
          <StaggerItem>
            <h2 className="font-appleDisplay mt-5 text-h1 text-ink-primary">{title}</h2>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-4 text-body-lg text-ink-tertiary">{subtitle}</p>
          </StaggerItem>
          <StaggerItem>
            <div className="ornament-line mx-auto mt-6 w-32" />
          </StaggerItem>
        </StaggerGroup>

        {/* 三块非对称功能 */}
        <div className="mt-24 space-y-32">
          <FeatureEditorial title={feature1Title} desc={feature1Desc} />
          <FeatureSplitScreen title={feature2Title} desc={feature2Desc} />
          <FeaturePolaroidStack title={feature3Title} desc={feature3Desc} />
        </div>
      </div>
    </section>
  )
}
