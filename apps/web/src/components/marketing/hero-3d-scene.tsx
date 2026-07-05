'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Hero3DScene — Hero 区多层视差背景
 * 三层 SVG 山脉（远 / 中 / 近）+ 浮动罗盘 + 等高线纹理
 * 鼠标移动时各层独立位移产生 3D 视差
 * 滚动时整体向上位移并淡出
 */
export function Hero3DScene() {
  const ref = useRef<HTMLDivElement>(null)

  // 鼠标视差
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 50, damping: 20 })
  const sy = useSpring(my, { stiffness: 50, damping: 20 })

  // 滚动视差（已移除淡出，避免下滑露出银色背景）

  // 远 / 中 / 近 三层位移幅度
  const farX = useTransform(sx, [-0.5, 0.5], [-12, 12])
  const farY = useTransform(sy, [-0.5, 0.5], [-6, 6])
  const midX = useTransform(sx, [-0.5, 0.5], [-24, 24])
  const midY = useTransform(sy, [-0.5, 0.5], [-12, 12])
  const nearX = useTransform(sx, [-0.5, 0.5], [-48, 48])
  const nearY = useTransform(sy, [-0.5, 0.5], [-24, 24])

  // 罗盘浮动
  const compassX = useTransform(sx, [-0.5, 0.5], [20, -20])
  const compassY = useTransform(sy, [-0.5, 0.5], [10, -10])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className="absolute inset-0 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* 渐变天空层 — Sunset Alpenglow: 奶油 → 桃色 → 珊瑚 → 落日橙 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #FFF8F2 0%, #FFE8D9 25%, #FFB088 55%, #FF8A5C 80%, #FF6B35 100%)',
        }}
      />
      {/* 暗色模式渐变 — 暖深棕 + 落日余晖 */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'linear-gradient(180deg, #1A1410 0%, #2A1F18 25%, #4A2A1F 55%, #6B3825 78%, #2A1F18 100%)',
        }}
      />

      {/* 星点（暗色模式可见） */}
      <div className="absolute inset-0 hidden dark:block">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-[2px] w-[2px] rounded-full bg-white"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 23) % 50}%`,
              opacity: 0.4,
            }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>

      {/* —— 远景山脉（暖灰褐雾） —— */}
      <motion.svg
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full"
        style={{ x: farX, y: farY, height: '60%' }}
      >
        <path
          d="M0,400 L0,260 L120,200 L240,240 L360,180 L480,220 L600,160 L720,210 L840,170 L960,220 L1080,180 L1200,230 L1320,190 L1440,240 L1440,400 Z"
          fill="#B8A695"
          opacity="0.5"
        />
      </motion.svg>

      {/* —— 中景山脉（深暖褐） —— */}
      <motion.svg
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full"
        style={{ x: midX, y: midY, height: '50%' }}
      >
        <path
          d="M0,400 L0,300 L100,240 L220,280 L340,200 L460,260 L580,180 L700,250 L820,200 L940,270 L1060,210 L1180,280 L1300,220 L1440,270 L1440,400 Z"
          fill="#5C4A3E"
          opacity="0.8"
        />
      </motion.svg>

      {/* —— 近景山脉（暖深棕渐变，带橙色山脊光） —— */}
      <motion.svg
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full"
        style={{ x: nearX, y: nearY, height: '38%' }}
      >
        <defs>
          <linearGradient id="near-mountain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F1611" />
            <stop offset="100%" stopColor="#3A2A1F" />
          </linearGradient>
        </defs>
        <path
          d="M0,300 L0,200 L80,160 L180,220 L300,140 L420,200 L540,120 L660,190 L780,130 L900,210 L1020,150 L1140,200 L1260,140 L1380,200 L1440,170 L1440,300 Z"
          fill="url(#near-mountain)"
        />
        {/* 山脊橙色光（落日照射） */}
        <path
          d="M0,200 L80,160 L180,220 L300,140 L420,200 L540,120 L660,190 L780,130 L900,210 L1020,150 L1140,200 L1260,140 L1380,200 L1440,170"
          fill="none"
          stroke="#FF6B35"
          strokeWidth="1.5"
          opacity="0.8"
        />
      </motion.svg>

      {/* —— 浮动 3D 罗盘（右上角） —— */}
      <motion.div
        className="absolute right-[8%] top-[18%] hidden md:block"
        style={{ x: compassX, y: compassY }}
      >
        <div className="relative h-32 w-32 opacity-70">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-azure/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          >
            {/* 罗盘刻度 */}
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-2 w-px bg-azure/50"
                style={{
                  transform: `rotate(${i * 30}deg) translateY(-60px)`,
                  transformOrigin: 'center',
                }}
              />
            ))}
          </motion.div>
          <div className="absolute inset-4 rounded-full border border-azure/30" />
          <motion.div
            className="absolute left-1/2 top-1/2 h-12 w-px origin-bottom bg-azure"
            style={{ transform: 'translate(-50%, -100%)' }}
            animate={{ rotate: [0, 30, -20, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: EASE }}
          />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-azure" />
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-overline text-azure">N</span>
        </div>
      </motion.div>

      {/* —— 底部渐变过渡到下一区 —— */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-canvas to-transparent" />
    </motion.div>
  )
}
