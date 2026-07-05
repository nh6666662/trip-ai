'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudSun,
  Wind,
  Droplets,
  Eye,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Thermometer,
  Gauge,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

// ===== 类型定义 =====

interface WeatherNow {
  temp: string
  text: string
  icon: string
  humidity: string
  windSpeed: string
  windDir: string
  pressure: string
  visibility: string
}

interface WeatherForecast {
  fxDate: string
  tempMax: string
  tempMin: string
  textDay: string
  iconDay: string
  humidity: string
  windSpeedDay: string
  uvIndex: string
}

interface WeatherWarning {
  id: string
  title: string
  level: string
  type: string
  text: string
}

interface AirQuality {
  aqi: string
  category: string
  pm25: string
  pm10: string
}

interface WeatherData {
  configured: boolean
  now: WeatherNow | null
  forecast: WeatherForecast[]
  warnings: WeatherWarning[]
  airQuality: AirQuality | null
  message?: string
}

// ===== 天气图标映射 =====

function WeatherIcon({ condition, icon, className }: { condition: string; icon?: string; className?: string }) {
  const c = condition || ''
  if (/晴/.test(c)) return <Sun className={className} />
  if (/多云/.test(c)) return <CloudSun className={className} />
  if (/阴/.test(c)) return <Cloud className={className} />
  if (/暴雨|大雨|中雨/.test(c)) return <CloudRain className={className} />
  if (/雨/.test(c)) return <CloudRain className={className} />
  if (/雪/.test(c)) return <CloudSnow className={className} />
  if (/雾|霾/.test(c)) return <Cloud className={className} />
  return <CloudSun className={className} />
}

// ===== 天气主题色 =====

function getWeatherTheme(condition: string): { gradient: string; accent: string } {
  const c = condition || ''
  if (/晴/.test(c)) return { gradient: 'from-amber-400 via-orange-400 to-sky-500', accent: 'text-amber-100' }
  if (/多云/.test(c)) return { gradient: 'from-sky-400 via-blue-400 to-indigo-500', accent: 'text-sky-100' }
  if (/阴/.test(c)) return { gradient: 'from-slate-400 via-gray-500 to-slate-600', accent: 'text-slate-100' }
  if (/暴雨|大雨/.test(c)) return { gradient: 'from-slate-600 via-blue-700 to-slate-800', accent: 'text-blue-100' }
  if (/雨/.test(c)) return { gradient: 'from-blue-400 via-blue-500 to-slate-600', accent: 'text-blue-100' }
  if (/雪/.test(c)) return { gradient: 'from-cyan-200 via-blue-300 to-indigo-300', accent: 'text-cyan-50' }
  if (/雾|霾/.test(c)) return { gradient: 'from-gray-300 via-slate-400 to-gray-500', accent: 'text-gray-100' }
  return { gradient: 'from-sky-400 via-blue-400 to-indigo-500', accent: 'text-sky-100' }
}

// ===== 天气旅行建议 =====

function getTravelAdvice(condition: string, temp: number): { text: string; level: 'good' | 'caution' | 'warning' } {
  const c = condition || ''
  if (/暴雨|大雪/.test(c)) {
    return { text: '极端天气，建议调整户外行程为室内活动', level: 'warning' }
  }
  if (/大雨|中雨/.test(c)) {
    return { text: '降雨较大，建议携带雨具并预留额外交通时间', level: 'caution' }
  }
  if (/小雨|阵雨/.test(c)) {
    return { text: '有小雨，建议带伞，户外景点可错峰安排', level: 'caution' }
  }
  if (/雪/.test(c)) {
    return { text: '降雪天气，注意保暖和路面湿滑', level: 'caution' }
  }
  if (/雾|霾/.test(c)) {
    return { text: '能见度较低，建议佩戴口罩', level: 'caution' }
  }
  if (temp > 35) {
    return { text: '高温天气，注意防晒补水，避免长时间户外', level: 'caution' }
  }
  if (temp < 0) {
    return { text: '气温偏低，注意保暖', level: 'caution' }
  }
  if (/晴|多云/.test(c)) {
    return { text: '天气宜人，适合户外游览', level: 'good' }
  }
  return { text: '天气状况一般，正常出行即可', level: 'good' }
}

// ===== 空气质量等级 =====

function getAqiLevel(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: '优', color: 'text-green-400' }
  if (aqi <= 100) return { label: '良', color: 'text-yellow-400' }
  if (aqi <= 150) return { label: '轻度污染', color: 'text-orange-400' }
  if (aqi <= 200) return { label: '中度污染', color: 'text-red-400' }
  return { label: '重度污染', color: 'text-purple-400' }
}

// ===== Hero 模式：透明背景 + 动态效果 =====

/** 根据 weather text 选择 hero 模式用的柔和渐变（透明背景叠在 GlassCard 之上）
 *  色阶保持 /40~/60 透明度，确保 GlassCard 玻璃质感透出
 */
export function getHeroGradient(condition: string): string {
  const c = condition || ''
  if (/晴/.test(c)) return 'from-sky-200/60 via-amber-100/40 to-orange-200/50'
  if (/多云/.test(c)) return 'from-sky-200/60 via-blue-100/40 to-indigo-200/50'
  // 阴天：加入淡蓝调，避免纯灰阶在大卡片上显得压抑
  if (/阴/.test(c)) return 'from-slate-200/50 via-gray-200/40 to-blue-100/40'
  // 暴雨/大雨：降低暗色，保持氛围但不压抑
  if (/暴雨|大雨/.test(c)) return 'from-slate-300/50 via-blue-400/40 to-slate-500/40'
  // 一般雨：中等饱和蓝
  if (/雨/.test(c)) return 'from-blue-200/50 via-blue-300/40 to-slate-300/40'
  // 雪：淡蓝 + 暖白，避免纯白苍白
  if (/雪/.test(c)) return 'from-cyan-100/50 via-blue-50/40 to-indigo-100/40'
  // 雾/霾：暖灰 + 微蓝，避免纯灰
  if (/雾|霾/.test(c)) return 'from-gray-100/50 via-slate-200/40 to-blue-50/40'
  return 'from-sky-200/60 via-blue-100/40 to-indigo-200/50'
}

/** Hero 模式下与天气文本匹配的微动画 — 用纯 CSS 实现，避免主线程卡顿 */
export function HeroWeatherAnimation({ condition }: { condition: string }) {
  const c = condition || ''
  // 晴天：太阳光芒缓慢旋转（CSS 动画，GPU 加速）
  if (/晴/.test(c)) {
    return (
      <div aria-hidden className="weather-anim-layer flex items-center justify-center">
        <div
          className="weather-anim-sun-ring h-32 w-32 border-2 border-dashed border-amber-300/50"
        />
        <div
          className="weather-anim-sun-ring-2 absolute h-44 w-44 border border-amber-200/30"
        />
      </div>
    )
  }
  // 雨天：雨滴下落（减少到 6 个，CSS 动画）
  if (/雨/.test(c)) {
    const drops = Array.from({ length: 6 })
    return (
      <div aria-hidden className="weather-anim-layer">
        {drops.map((_, i) => (
          <span
            key={i}
            className="weather-anim-rain"
            style={{
              left: `${10 + i * 14}%`,
              height: 10 + (i % 3) * 4,
              animationDuration: `${1.1 + (i % 4) * 0.18}s`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    )
  }
  // 阴天 / 多云 / 雾霾：云朵飘动（CSS 动画）
  if (/阴|多云|雾|霾/.test(c)) {
    return (
      <div aria-hidden className="weather-anim-layer">
        <div className="weather-anim-cloud weather-anim-cloud-right -left-10 top-2 h-16 w-24" />
        <div className="weather-anim-cloud weather-anim-cloud-left right-0 top-12 h-12 w-20" style={{ background: 'rgba(255, 255, 255, 0.3)' }} />
      </div>
    )
  }
  // 雪天：雪点缓慢飘落（减少到 5 个，CSS 动画）
  if (/雪/.test(c)) {
    const flakes = Array.from({ length: 5 })
    return (
      <div aria-hidden className="weather-anim-layer">
        {flakes.map((_, i) => (
          <span
            key={i}
            className="weather-anim-snow"
            style={{
              left: `${15 + i * 16}%`,
              // 雪花横向漂移用 CSS 变量传入
              ['--snow-x' as string]: `${i % 2 ? 8 : -8}px`,
              animationDuration: `${3 + (i % 3) * 0.6}s`,
              animationDelay: `${i * 0.5}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    )
  }
  return null
}

// ===== 主组件 =====

export interface WeatherCardProps {
  location: string
  className?: string
  /**
   * 渲染模式：
   * - 'full'（默认）：完整卡片，含预报 / 预警 / 空气质量
   * - 'hero'：透明背景的紧凑 Hero 模式，用于嵌入 GlassCard 右栏，
   *   动态渐变 + 微动画 + 大号温度，仅展示实时天气
   */
  variant?: 'full' | 'hero'
  /** hero 模式下是否透明背景（背景由父级提供） */
  transparent?: boolean
}

export function WeatherCard({ location, className, variant = 'full', transparent = false }: WeatherCardProps) {
  const [data, setData] = React.useState<WeatherData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  const fetchWeather = React.useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/weather?location=${encodeURIComponent(location)}`)
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json()
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [location])

  React.useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  // 加载中
  if (loading) {
    if (variant === 'hero') return <WeatherHeroSkeleton className={className} />
    return <WeatherCardSkeleton className={className} />
  }

  // 错误
  if (error || !data) {
    if (variant === 'hero') {
      return (
        <div className={cn('flex items-center gap-2 text-sm text-gray-500', className)}>
          <CloudSun className="h-5 w-5 text-gray-400" />
          <span>天气加载失败</span>
          <button onClick={fetchWeather} className="text-ink-quaternary hover:text-ink-secondary">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }
    return (
      <div className={cn('rounded-2xl border border-border bg-surface-elevated p-6', className)}>
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-ink-tertiary">天气加载失败</span>
          <button onClick={fetchWeather} className="text-ink-quaternary hover:text-ink-secondary">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // 天气 API 未配置
  if (!data.configured) {
    if (variant === 'hero') {
      return (
        <div className={cn('flex items-center gap-2 text-sm text-gray-400', className)}>
          <CloudSun className="h-5 w-5 text-neutral-300" />
          <span>{data.message ?? '天气未配置'}</span>
        </div>
      )
    }
    return (
      <div className={cn('rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-center', className)}>
        <CloudSun className="mx-auto h-8 w-8 text-neutral-300" />
        <p className="mt-2 text-body-sm text-ink-quaternary">{data.message ?? '天气 API 未配置'}</p>
      </div>
    )
  }

  const now = data.now
  const condition = now?.text ?? '未知'
  const temp = now ? parseFloat(now.temp) : 20
  const theme = getWeatherTheme(condition)
  const advice = getTravelAdvice(condition, temp)

  // ===== Hero 模式：透明背景 + 动态效果，适合放在 GlassCard 右栏 =====
  if (variant === 'hero') {
    const heroGradient = getHeroGradient(condition)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className={cn(
          'relative overflow-hidden rounded-2xl p-5',
          !transparent && 'bg-gradient-to-br',
          !transparent && heroGradient,
          className,
        )}
      >
        {/* 动态天气效果层（transparent 模式下由父级提供） */}
        {!transparent && <HeroWeatherAnimation condition={condition} />}

        {/* 装饰性柔光圆 */}
        {!transparent && <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/30 blur-2xl" />}

        <div className="relative flex flex-col gap-3">
          {/* 位置 + 刷新 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <MapPin className="h-3 w-3" />
              {location}
            </div>
            <button
              onClick={fetchWeather}
              className="rounded-full bg-white/40 p-1 text-gray-600 transition-colors hover:bg-white/60"
              aria-label="刷新天气"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          {/* 温度 + 大图标 */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-0.5">
                <span className="font-appleDisplay text-5xl font-semibold tabular-nums tracking-tight text-gray-700">
                  {now?.temp ?? '--'}
                </span>
                <span className="text-xl font-light text-gray-500">°C</span>
              </div>
              <p className="mt-0.5 text-sm font-medium text-gray-600">{condition}</p>
            </div>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
              className="shrink-0"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <WeatherIcon condition={condition} className="h-16 w-16 text-gray-700 drop-shadow-sm" />
              </motion.div>
            </motion.div>
          </div>

          {/* 湿度 / 风速 小字底部 */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              {now?.humidity ?? '--'}%
            </span>
            <span className="flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {now?.windDir ?? ''} {now?.windSpeed ?? '--'}km/h
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  // ===== full 模式：原有完整渲染（保持不变） =====

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={cn('overflow-hidden rounded-2xl shadow-lg', className)}
    >
      {/* 渐变背景头部 — 实时天气 */}
      <div className={cn('relative bg-gradient-to-br p-6 text-white', theme.gradient)}>
        {/* 装饰性背景圆 */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-12 -left-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />

        <div className="relative">
          {/* 位置 + 刷新 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-body-sm font-medium opacity-90">{location}</span>
            </div>
            <button
              onClick={fetchWeather}
              className="rounded-full bg-white/20 p-1.5 transition-colors hover:bg-white/30"
              aria-label="刷新天气"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 温度 + 图标 */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-h1 font-bold tabular-nums">
                  {now?.temp ?? '--'}
                </span>
                <span className="text-h4 font-light">°C</span>
              </div>
              <p className="mt-1 text-body font-medium opacity-95">{condition}</p>
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <WeatherIcon condition={condition} className="h-16 w-16 drop-shadow-lg" />
            </motion.div>
          </div>

          {/* 指标条 */}
          <div className="mt-5 flex items-center gap-4 text-body-sm">
            <span className="flex items-center gap-1 opacity-90">
              <Droplets className="h-3.5 w-3.5" />
              {now?.humidity ?? '--'}%
            </span>
            <span className="flex items-center gap-1 opacity-90">
              <Wind className="h-3.5 w-3.5" />
              {now?.windDir ?? ''} {now?.windSpeed ?? '--'}km/h
            </span>
            <span className="flex items-center gap-1 opacity-90">
              <Eye className="h-3.5 w-3.5" />
              {now?.visibility ?? '--'}km
            </span>
          </div>
        </div>
      </div>

      {/* 白色内容区 */}
      <div className="bg-surface-elevated p-4">
        {/* 旅行建议 */}
        <div
          className={cn(
            'mb-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-body-sm',
            advice.level === 'good' && 'bg-green-50 text-green-700',
            advice.level === 'caution' && 'bg-amber-50 text-amber-700',
            advice.level === 'warning' && 'bg-red-50 text-red-700',
          )}
        >
          {advice.level === 'good' && <Sun className="mt-0.5 h-4 w-4 shrink-0" />}
          {advice.level === 'caution' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {advice.level === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{advice.text}</span>
        </div>

        {/* 灾害预警 */}
        {data.warnings.length > 0 && (
          <div className="mb-4 space-y-2">
            <AnimatePresence>
              {data.warnings.map((w) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border px-3 py-2 text-body-sm',
                    w.level === '红色' && 'border-red-200 bg-red-50 text-red-700',
                    w.level === '橙色' && 'border-orange-200 bg-orange-50 text-orange-700',
                    w.level === '黄色' && 'border-yellow-200 bg-yellow-50 text-yellow-700',
                    w.level === '蓝色' && 'border-blue-200 bg-blue-50 text-blue-700',
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-medium">{w.title}</span>
                    <span className="ml-1.5 text-caption opacity-70">{w.level}预警</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 空气质量 */}
        {data.airQuality && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-ink-quaternary" />
              <span className="text-body-sm text-ink-secondary">空气质量</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-body-sm font-semibold', getAqiLevel(parseInt(data.airQuality.aqi || '0')).color)}>
                {getAqiLevel(parseInt(data.airQuality.aqi || '0')).label}
              </span>
              <span className="text-caption text-ink-quaternary">
                AQI {data.airQuality.aqi} · PM2.5 {data.airQuality.pm25}
              </span>
            </div>
          </div>
        )}

        {/* 7 天预报 */}
        {data.forecast.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-caption font-medium text-ink-tertiary">
              <Thermometer className="h-3 w-3" />
              7 天预报
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {data.forecast.map((f, i) => {
                const isToday = i === 0
                const date = new Date(f.fxDate)
                const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
                return (
                  <div
                    key={f.fxDate}
                    className={cn(
                      'flex min-w-[52px] flex-col items-center gap-1 rounded-lg px-2 py-2',
                      isToday ? 'bg-accent-muted text-accent' : 'bg-surface-muted',
                    )}
                  >
                    <span className="text-caption font-medium">
                      {isToday ? '今天' : `周${weekday}`}
                    </span>
                    <WeatherIcon condition={f.textDay} className="h-5 w-5 text-ink-tertiary" />
                    <span className="text-caption text-ink-quaternary">{f.textDay.slice(0, 2)}</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-caption font-semibold text-ink-secondary">{f.tempMax}°</span>
                      <span className="text-caption text-ink-quaternary">{f.tempMin}°</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ===== 骨架屏 =====

function WeatherCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-border', className)}>
      <div className="h-48 animate-pulse bg-gradient-to-br from-sky-200 to-indigo-200" />
      <div className="space-y-3 p-4">
        <div className="h-8 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  )
}

function WeatherHeroSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-200/50 via-blue-100/40 to-indigo-200/50 p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-white/40" />
        <div className="h-3 w-3 animate-pulse rounded-full bg-white/40" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-10 w-24 animate-pulse rounded bg-white/50" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/40" />
        </div>
        <div className="h-16 w-16 animate-pulse rounded-full bg-white/50" />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="h-3 w-14 animate-pulse rounded bg-white/40" />
        <div className="h-3 w-20 animate-pulse rounded bg-white/40" />
      </div>
    </div>
  )
}
