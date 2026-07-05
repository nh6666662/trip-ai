'use client'

import * as React from 'react'
import { getHeroGradient, HeroWeatherAnimation } from './weather-card'

interface WeatherHeroBackgroundProps {
  location: string
  className?: string
}

interface WeatherData {
  now?: { text?: string }
}

/**
 * 天气背景层：根据目的地天气渲染渐变底色 + 动态动画
 * 用于嵌入大卡片背景，让天气氛围覆盖整个卡片
 */
export function WeatherHeroBackground({ location, className }: WeatherHeroBackgroundProps) {
  const [condition, setCondition] = React.useState<string>('')

  React.useEffect(() => {
    let cancelled = false
    fetch(`/api/weather?location=${encodeURIComponent(location)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: WeatherData | null) => {
        if (!cancelled && data?.now?.text) {
          setCondition(data.now.text)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [location])

  const gradient = getHeroGradient(condition)

  return (
    <div className={className}>
      {/* 渐变底色层 */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {/* 动态天气动画层 */}
      <HeroWeatherAnimation condition={condition} />
    </div>
  )
}
