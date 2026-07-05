'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Compass } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Hero3DScene } from './hero-3d-scene'
import { useTilt } from './use-tilt'

interface HeroProps {
  badge: string
  title: string
  subtitle: string
  ctaPrimary: string
  ctaSecondary: string
}

const EASE = [0.16, 1, 0.3, 1] as const

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE, delay },
})

/** 附加文字（多行打字机效果） */
const EXTRA_LINES = [
  '从一行想法到一份完整行程，AI 在 30 秒内为你绘制专属旅程地图。',
  '覆盖全国 800+ 城市，10 万+ POI 数据实时更新。',
  '天气预警、人流监测、交通动态，让每次出行都从容不迫。',
  '现在就开始，让旅智 TripAI 陪你丈量世界。',
]

/** 打字机 Hook：每 intervalMs 推进一个字符，startDelay 控制开始时机 */
function useTypewriter(text: string, startDelay: number, intervalMs: number) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), startDelay)
    return () => clearTimeout(startTimer)
  }, [startDelay])

  useEffect(() => {
    if (!started) return
    if (count >= text.length) return
    const timer = setTimeout(() => setCount((c) => c + 1), intervalMs)
    return () => clearTimeout(timer)
  }, [started, count, text, intervalMs])

  return { text: text.slice(0, count), done: count >= text.length }
}

/** 循环打字机 Hook：打字→停留→删除→切换下一行，无限循环 */
function useLoopTypewriter(
  lines: string[],
  startDelay: number,
  typeMs: number,
  deleteMs: number,
  pauseMs: number,
) {
  const [lineIndex, setLineIndex] = useState(0)
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay)
    return () => clearTimeout(t)
  }, [startDelay])

  useEffect(() => {
    if (!started) return
    const currentLine = lines[lineIndex] ?? ''

    if (phase === 'typing') {
      if (count < currentLine.length) {
        const t = setTimeout(() => setCount((c) => c + 1), typeMs)
        return () => clearTimeout(t)
      }
      // 打完当前行，停留后开始删除
      const t = setTimeout(() => setPhase('deleting'), pauseMs)
      return () => clearTimeout(t)
    }

    if (phase === 'deleting') {
      if (count > 0) {
        const t = setTimeout(() => setCount((c) => c - 1), deleteMs)
        return () => clearTimeout(t)
      }
      // 删完，切换下一行
      setLineIndex((i) => (i + 1) % lines.length)
      setPhase('typing')
    }
  }, [started, phase, count, lineIndex, lines, typeMs, deleteMs, pauseMs])

  const currentLine = lines[lineIndex] ?? ''
  const text = currentLine.slice(0, count)
  return { text, lineIndex }
}

/** 闪烁光标 */
function Cursor() {
  return (
    <motion.span
      aria-hidden
      className="inline-block w-[3px] -mb-2 ml-1 text-accent"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
      style={{ fontWeight: 300 }}
    >
      |
    </motion.span>
  )
}

/** 打印机效果：字符逐个淡入 + 模糊→清晰 */
function PrinterText({ text, startDelay }: { text: string; startDelay: number }) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), startDelay)
    return () => clearTimeout(timer)
  }, [startDelay])

  const chars = Array.from(text)

  return (
    <span aria-label={text} className="inline-block whitespace-pre-wrap">
      {chars.map((char, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={started ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.18, ease: EASE, delay: i * 0.022 }}
          className="inline-block whitespace-pre"
        >
          {char}
        </motion.span>
      ))}
    </span>
  )
}

/**
 * Hero 区 — Sunset Alpenglow 3D 沉浸式首屏
 * 主标题第二行 + 附加文字用打字机效果，副标题用打印机效果
 */
export function Hero({
  badge,
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
}: HeroProps) {
  const tilt = useTilt({ max: 4, perspective: 2000 })

  const titleLines = title.split('\n')
  const firstLine = titleLines[0] || ''
  const secondLine = titleLines[1] || ''

  // 第二行打字机：在第一行 fadeUp（delay 0.22 + duration 0.9）后开始
  const secondLineTw = useTypewriter(secondLine, 1300, 90)
  // 附加文字循环打字机：打字→停留→删除→下一句，无限循环
  const extraTw = useLoopTypewriter(EXTRA_LINES, 3200, 60, 30, 1500)

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Hero3DScene />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
        className="relative z-10 mx-auto max-w-4xl pt-24 text-center"
        style={tilt.style}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
      >
        {/* 浮动方向指示（左上） */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.6 }}
          className="absolute -left-8 -top-4 hidden lg:block"
        >
          <div className="flex items-center gap-2 text-overline text-gray-400">
            <Compass className="h-4 w-4" />
            <span>N 30°16′ · E 120°09′</span>
          </div>
          <div className="mt-1 h-8 w-px bg-gradient-to-b from-gray-400 to-transparent" />
        </motion.div>

        {/* Badge 胶囊 */}
        <motion.span
          {...fadeUp(0.1)}
          className="inline-flex items-center gap-2 rounded-full border border-azure/40 bg-azure-muted px-5 py-2 text-overline text-azure shadow-azure backdrop-blur-md"
        >
          <Sparkles className="h-3 w-3" />
          {badge}
        </motion.span>

        {/* 主标题：第一行 fadeUp + 第二行打字机 */}
        <motion.h1
          {...fadeUp(0.22)}
          className="font-appleDisplay mt-8 text-display text-ink-primary [text-shadow:0_2px_24px_rgba(11,22,32,0.18)]"
        >
          <span className="block">{firstLine}</span>
          {secondLine && (
            <span className="text-gradient block italic">
              {secondLineTw.text}
              {!secondLineTw.done && <Cursor />}
            </span>
          )}
        </motion.h1>

        {/* 副标题：打印机效果 */}
        <motion.div
          {...fadeUp(0.36)}
          className="mx-auto mt-7 max-w-2xl text-body-lg leading-relaxed text-ink-primary/80 [text-shadow:0_1px_12px_rgba(11,22,32,0.4)]"
        >
          <PrinterText text={subtitle} startDelay={1500} />
        </motion.div>

        {/* 附加文字：循环打字机效果（打字→删除→下一句） */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 3.1 }}
          className="mx-auto mt-4 min-h-[1.5em] max-w-2xl text-body leading-relaxed text-ink-primary/70 [text-shadow:0_1px_12px_rgba(11,22,32,0.4)]"
        >
          {extraTw.text}
          <Cursor />
        </motion.p>

        {/* CTA — azure 主按钮 + 玻璃次按钮 */}
        <motion.div
          {...fadeUp(0.5)}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/trips"
            className="group relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-azure px-9 text-h4 text-white shadow-azure transition-all hover:-translate-y-1 hover:shadow-xl sm:w-auto"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative font-appleDisplay">{ctaPrimary}</span>
            <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#features"
            className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-ink-primary/20 bg-ink-primary/5 px-9 font-sans text-body text-ink-primary backdrop-blur-md transition-all hover:-translate-y-1 hover:border-ink-primary/40 hover:bg-ink-primary/10 sm:w-auto"
          >
            {ctaSecondary}
          </a>
        </motion.div>

        {/* 底部「滚动探索」指示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 1 }}
          className="mt-20 flex flex-col items-center gap-2"
        >
          <span className="text-overline text-ink-primary/60">SCROLL · 探索</span>
          <motion.div
            className="h-10 w-px bg-gradient-to-b from-ink-primary/60 to-transparent"
            animate={{ scaleY: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: EASE }}
            style={{ transformOrigin: 'top' }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
