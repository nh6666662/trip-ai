'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

// 统一的 ease-out-expo 缓动曲线（与项目总纲 3.8 动效规范一致）
const EASE = [0.16, 1, 0.3, 1] as const

interface ScrollRevealProps {
  children: ReactNode
  /** 错峰延迟（秒），默认 0 */
  delay?: number
  /** 浮入距离（px），默认 28 */
  y?: number
  /** 一次还是每次进入都触发，默认 once */
  once?: boolean
  /** 视口阈值，默认 0.2 */
  amount?: number
  className?: string
  /** 渲染标签，默认 div */
  as?: 'div' | 'section' | 'li' | 'span'
}

/**
 * ScrollReveal — 滚动进入视口时错峰浮入
 * 基于 framer-motion whileInView，自动遵守 prefers-reduced-motion
 */
export function ScrollReveal({
  children,
  delay = 0,
  y = 28,
  once = true,
  amount = 0.2,
  className,
  as = 'div',
}: ScrollRevealProps) {
  const variants: Variants = {
    hidden: { opacity: 0, y, rotateX: 6 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.7, ease: EASE, delay },
    },
  }

  const MotionTag = motion[as]

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * 错峰容器：子元素逐个浮入
 * 用法：<StaggerGroup amount={0.3}><StaggerItem delay={0}>...</StaggerItem></StaggerGroup>
 */
export function StaggerGroup({
  children,
  className,
  stagger = 0.12,
  once = true,
  amount = 0.2,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  once?: boolean
  amount?: number
}) {
  const variants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger },
    },
  }
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 28,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  y?: number
  delay?: number
}) {
  const variants: Variants = {
    hidden: { opacity: 0, y, rotateX: 6 },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.6, ease: EASE, delay },
    },
  }
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}
