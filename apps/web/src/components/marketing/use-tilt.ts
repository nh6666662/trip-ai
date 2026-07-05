'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMotionValue, useSpring, useTransform, type MotionStyle } from 'framer-motion'

interface TiltOptions {
  /** 最大倾斜角度（度），默认 8 */
  max?: number
  /** 透视距离 px，默认 1200 */
  perspective?: number
  /** 弹簧刚度，默认 120 */
  stiffness?: number
  /** 弹簧阻尼，默认 18 */
  damping?: number
}

interface TiltResult {
  /** 绑定到 motion 容器的 style */
  style: MotionStyle
  /** 绑定到容器的鼠标事件 handler */
  onMouseMove: (e: React.MouseEvent<HTMLElement>) => void
  onMouseLeave: () => void
  /** 是否支持 3D（prefers-reduced-motion 时为 false） */
  enabled: boolean
}

/**
 * useTilt — 鼠标驱动的 3D 倾斜 Hook
 * 鼠标在容器内移动时，容器绕 X / Y 轴轻微旋转，产生 3D 视差
 * 自动尊重 prefers-reduced-motion：降级为静态
 */
export function useTilt({
  max = 8,
  perspective = 1200,
  stiffness = 120,
  damping = 18,
}: TiltOptions = {}): TiltResult {
  const [enabled, setEnabled] = useState(true)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness, damping })
  const sy = useSpring(my, { stiffness, damping })

  // -0.5 ~ 0.5 → -max ~ max
  const rotateY = useTransform(sx, [-0.5, 0.5], [max, -max])
  const rotateX = useTransform(sy, [-0.5, 0.5], [-max, max])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(!mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!enabled) return
      const rect = e.currentTarget.getBoundingClientRect()
      mx.set((e.clientX - rect.left) / rect.width - 0.5)
      my.set((e.clientY - rect.top) / rect.height - 0.5)
    },
    [enabled, mx, my]
  )

  const onMouseLeave = useCallback(() => {
    mx.set(0)
    my.set(0)
  }, [mx, my])

  return {
    style: enabled
      ? { perspective, rotateX, rotateY, transformStyle: 'preserve-3d' }
      : {},
    onMouseMove,
    onMouseLeave,
    enabled,
  }
}
