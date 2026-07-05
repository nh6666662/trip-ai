'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  /** 目标数值，如 98、10、24 */
  end: number
  /** 起始值，默认 0 */
  start?: number
  /** 动画时长（毫秒），默认 1600 */
  duration?: number
  /** 前缀，如 "¥" */
  prefix?: string
  /** 后缀，如 "万+"、"%"、"h" */
  suffix?: string
  /** 小数位数，默认 0 */
  decimals?: number
  className?: string
}

/**
 * CountUp — 滚动进入视口时数字从 0 计数到目标值
 * 基于 IntersectionObserver + requestAnimationFrame，遵守 prefers-reduced-motion
 */
export function CountUp({
  end,
  start = 0,
  duration = 1600,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: CountUpProps) {
  const [value, setValue] = useState(start)
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // 尊重「减少动态效果」：直接显示终值
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) {
      setValue(end)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true
            const startTime = performance.now()

            const tick = (now: number) => {
              const elapsed = now - startTime
              const progress = Math.min(elapsed / duration, 1)
              // ease-out-expo 缓动
              const eased =
                progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
              const current = start + (end - start) * eased
              setValue(current)
              if (progress < 1) {
                requestAnimationFrame(tick)
              } else {
                setValue(end)
              }
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [end, start, duration])

  const formatted = value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
