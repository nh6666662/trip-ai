'use client'

import { motion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * 流动光点 —— 多个错峰漂浮的小光点
 * 用于 Hero / AI 演示区背景，营造空气感与旅行途中的"沿途风景"
 */
export function FloatingDots({ className }: { className?: string }) {
  const dots = [
    { left: '12%', top: '22%', size: 6, delay: 0, color: 'bg-azure', dur: 7 },
    { left: '28%', top: '68%', size: 4, delay: 1.2, color: 'bg-gray-400', dur: 9 },
    { left: '52%', top: '30%', size: 8, delay: 0.6, color: 'bg-azure/60', dur: 8 },
    { left: '74%', top: '55%', size: 5, delay: 2, color: 'bg-gray-400', dur: 7.5 },
    { left: '86%', top: '28%', size: 4, delay: 0.3, color: 'bg-azure', dur: 9.5 },
    { left: '42%', top: '78%', size: 6, delay: 1.8, color: 'bg-azure/60', dur: 8.5 },
    { left: '64%', top: '18%', size: 3, delay: 2.4, color: 'bg-gray-400', dur: 7 },
    { left: '18%', top: '48%', size: 5, delay: 1.5, color: 'bg-azure', dur: 8 },
  ]

  return (
    <div className={className} aria-hidden>
      {dots.map((dot, i) => (
        <motion.span
          key={i}
          className={`absolute rounded-full ${dot.color} blur-[1px]`}
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
          }}
          animate={{
            y: [0, -22, 0],
            x: [0, 8, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: dot.dur,
            delay: dot.delay,
            repeat: Infinity,
            ease: EASE,
          }}
        />
      ))}
    </div>
  )
}

/**
 * 旅行地标节点 —— 沿水平线分布的地点标记 + 虚线连接
 * 用于 Feature 区顶部装饰，呼应"旅行路线"
 */
export function RouteLine({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 1000 40"
        fill="none"
        className="w-full"
        preserveAspectRatio="none"
      >
        <line
          x1="60"
          y1="20"
          x2="940"
          y2="20"
          stroke="#0071E3"
          strokeWidth="2"
          strokeDasharray="2 10"
        />
        {[120, 360, 640, 880].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="20" r="6" fill="#fff" stroke="#0071E3" strokeWidth="2" />
            {i === 1 && (
              <circle cx={x} cy="20" r="10" fill="#0071E3" opacity="0.15" />
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * PolaroidFrame — Polaroid 拍立得卡片框
 * 用于 Feature 3 UGC 社区拼贴
 */
export function PolaroidFrame({
  children,
  rotate = 0,
  className,
}: {
  children: React.ReactNode
  rotate?: number
  className?: string
}) {
  return (
    <div
      className={`polaroid-shadow relative rounded-sm bg-surface-elevated p-3 pb-12 ${className ?? ''}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* 顶部胶带装饰 */}
      <div
        className="absolute -top-2 left-1/2 h-5 w-16 -translate-x-1/2 rotate-1 bg-gray-400/30 backdrop-blur-sm"
        aria-hidden
      />
      {children}
    </div>
  )
}

/**
 * WeatherSplitIcon — 晴雨分屏图标（Feature 2 用）
 */
export function WeatherSplitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="weather-split" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#86868B" />
          <stop offset="50%" stopColor="#86868B" />
          <stop offset="50%" stopColor="#0071E3" />
          <stop offset="100%" stopColor="#0071E3" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#weather-split)" opacity="0.18" />
      {/* 左半太阳 */}
      <g>
        <circle cx="22" cy="28" r="8" fill="#86868B" />
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={i}
            x1={22}
            y1={28}
            x2={22 + Math.cos((i * 72 - 90) * Math.PI / 180) * 14}
            y2={28 + Math.sin((i * 72 - 90) * Math.PI / 180) * 14}
            stroke="#86868B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ))}
      </g>
      {/* 右半云雨 */}
      <g>
        <path d="M32 30 Q40 24 46 30 Q52 30 52 36 Q52 42 46 42 L34 42 Q28 42 28 36 Q28 30 32 30 Z" fill="#0071E3" />
        <line x1="36" y1="44" x2="34" y2="50" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="42" y1="44" x2="40" y2="50" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="48" y1="44" x2="46" y2="50" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {/* 中间分隔线 */}
      <line x1="32" y1="6" x2="32" y2="58" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.4" />
    </svg>
  )
}
