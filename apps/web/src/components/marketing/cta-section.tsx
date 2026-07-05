'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { StaggerGroup, StaggerItem } from './scroll-reveal'

interface CTASectionProps {
  title: string
  subtitle: string
  ctaPrimary: string
}

/**
 * CTA 区 — Cinematic Horizon 全幅地平线
 * 顶部：渐变天空（teal → coral）+ 远山轮廓
 * 底部：3D 透视网格地面（CSS perspective + repeating-linear-gradient）
 * 中央：coral 主 CTA 按钮（呼吸光晕）
 */
export function CTASection({ title, subtitle, ctaPrimary }: CTASectionProps) {
  return (
    <section className="relative overflow-hidden px-4 py-34">
      {/* —— Sunset Alpenglow 暖橙渐变背景 —— */}
      <div
        className="absolute inset-0 -z-30"
        style={{
          background:
            'linear-gradient(180deg, #FFE8D9 0%, #FFB088 30%, #FF8A5C 55%, #6B3825 80%, #1F1611 100%)',
        }}
      />
      <div
        className="absolute inset-0 -z-30 hidden dark:block"
        style={{
          background:
            'linear-gradient(180deg, #2A1F18 0%, #4A2A1F 28%, #6B3825 48%, #4A2A1F 72%, #1A1410 90%, #000000 100%)',
        }}
      />

      {/* 多层山脉无限前运动动画（Sunset Alpenglow 暖橙主题） */}
      <div className="absolute inset-x-0 top-1/2 -z-20 h-48 w-full overflow-hidden" aria-hidden>
        {/* 远层山脉 — 速度最慢，颜色最浅 */}
        <motion.svg
          viewBox="0 0 2880 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-full w-[200%]"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          <path
            d="M0,200 L0,140 L120,100 L240,130 L360,80 L480,120 L600,70 L720,110 L840,75 L960,120 L1080,85 L1200,125 L1320,90 L1440,130 L1560,100 L1680,135 L1800,95 L1920,130 L2040,80 L2160,120 L2280,75 L2400,115 L2520,85 L2640,125 L2760,95 L2880,130 L2880,200 Z"
            fill="#FF8A5C"
            opacity="0.35"
          />
        </motion.svg>

        {/* 中层山脉 — 速度中，颜色中 */}
        <motion.svg
          viewBox="0 0 2880 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-full w-[200%]"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        >
          <path
            d="M0,200 L0,150 L100,110 L220,140 L340,90 L460,130 L580,80 L700,125 L820,95 L940,135 L1060,85 L1180,130 L1300,100 L1420,140 L1540,90 L1660,125 L1780,95 L1900,135 L2020,80 L2140,120 L2260,90 L2380,130 L2500,100 L2620,140 L2740,95 L2880,130 L2880,200 Z"
            fill="#E27856"
            opacity="0.55"
          />
        </motion.svg>

        {/* 近层山脉 — 速度最快，颜色最深 */}
        <motion.svg
          viewBox="0 0 2880 200"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-full w-[200%]"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          <path
            d="M0,200 L0,170 L80,140 L200,165 L320,120 L440,155 L560,110 L680,150 L800,125 L920,160 L1040,115 L1160,150 L1280,130 L1400,165 L1520,120 L1640,155 L1760,130 L1880,165 L2000,115 L2120,150 L2240,130 L2360,160 L2480,120 L2600,155 L2720,130 L2880,165 L2880,200 Z"
            fill="#1F1611"
            opacity="0.85"
          />
        </motion.svg>
      </div>

      {/* 3D 透视网格地面 */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-1/2"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,107,53,0.18) 0px, rgba(255,107,53,0.18) 1px, transparent 1px, transparent 80px), repeating-linear-gradient(0deg, rgba(255,107,53,0.18) 0px, rgba(255,107,53,0.18) 1px, transparent 1px, transparent 40px)',
          transform: 'perspective(600px) rotateX(60deg)',
          transformOrigin: 'bottom',
          maskImage: 'linear-gradient(to top, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
        }}
      />

      {/* —— 内容区 —— */}
      <div className="relative mx-auto max-w-3xl text-center">
        <StaggerGroup stagger={0.18}>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-azure/40 bg-azure-muted px-4 py-1.5 text-overline text-azure backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-azure" />
              START YOUR VOYAGE
            </span>
          </StaggerItem>
          <StaggerItem>
            <h2 className="font-appleDisplay mt-6 text-display text-white [text-shadow:0_2px_24px_rgba(11,22,32,0.4)]">
              {title}
            </h2>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-5 max-w-xl text-body-lg text-white/85 [text-shadow:0_1px_12px_rgba(11,22,32,0.5)]">
              {subtitle}
            </p>
          </StaggerItem>
          <StaggerItem>
            <Link
              href="/trips"
              className="group mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-azure px-10 font-appleDisplay text-h4 text-white shadow-azure transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="relative">{ctaPrimary}</span>
              <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </StaggerItem>
        </StaggerGroup>
      </div>
    </section>
  )
}
