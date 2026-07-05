'use client'

import * as React from 'react'
import { MapPin, Search, Loader2, LocateFixed, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface PlaceResult {
  name: string
  district?: string
  address?: string
  location?: { lat: number; lng: number }
}

interface PlaceSearchInputProps {
  value: string
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
}

/**
 * 地点搜索输入框
 * - 输入文字 → 调用高德输入提示 API → 显示下拉建议
 * - 点击定位按钮 → 调用浏览器 Geolocation → 逆地理编码获取地名
 * - 支持手动输入（无建议时直接使用输入文字）
 */
export function PlaceSearchInput({
  value,
  onPlaceSelect,
  placeholder = '搜索地点或使用定位',
  className,
}: PlaceSearchInputProps) {
  const [query, setQuery] = React.useState(value)
  const [suggestions, setSuggestions] = React.useState<PlaceResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [locating, setLocating] = React.useState(false)
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 同步外部 value 变化
  React.useEffect(() => {
    setQuery(value)
  }, [value])

  // 防抖搜索
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/places/search?keywords=${encodeURIComponent(query.trim())}`,
        )
        if (!res.ok) throw new Error('搜索失败')
        const data = await res.json()
        setSuggestions(Array.isArray(data) ? data : [])
        setShowSuggestions(true)
      } catch (e) {
        setError('搜索失败，请重试')
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // 点击外部关闭建议
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 定位
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('浏览器不支持定位')
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `/api/places/reverse?lat=${latitude}&lng=${longitude}`,
          )
          if (!res.ok) throw new Error('逆地理编码失败')
          const data = await res.json()
          const place: PlaceResult = {
            name: data.name || '当前位置',
            address: data.formatted_address || '',
            location: { lat: latitude, lng: longitude },
          }
          setQuery(place.name)
          onPlaceSelect(place)
          setShowSuggestions(false)
        } catch {
          // 逆地理编码失败，仍允许使用坐标
          const place: PlaceResult = {
            name: '当前位置',
            location: { lat: latitude, lng: longitude },
          }
          setQuery(place.name)
          onPlaceSelect(place)
        } finally {
          setLocating(false)
        }
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError('定位权限被拒绝，请在浏览器设置中允许')
        } else if (err.code === err.TIMEOUT) {
          setError('定位超时，请重试')
        } else {
          setError('定位失败，请手动输入地点')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const handleSelectSuggestion = (place: PlaceResult) => {
    setQuery(place.name)
    onPlaceSelect(place)
    setShowSuggestions(false)
  }

  // 手动输入（无建议时，用户按 Enter 或失焦时使用输入文字）
  const handleManualSubmit = () => {
    if (!query.trim()) return
    // 如果当前输入文字与某个建议匹配，使用建议的坐标
    const matched = suggestions.find((s) => s.name === query.trim())
    if (matched) {
      onPlaceSelect(matched)
      return
    }
    // 否则使用输入文字作为地名（无坐标，后端会要求选择建议）
    onPlaceSelect({ name: query.trim() })
    setShowSuggestions(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-ink-quaternary pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleManualSubmit()
            }
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-glass-border bg-glass-subtle pl-9 pr-20 text-body text-ink-primary placeholder:text-ink-quaternary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
        />
        {/* 定位按钮 */}
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          aria-label="使用当前位置"
          className="absolute right-9 flex h-7 w-7 items-center justify-center rounded-md text-ink-tertiary hover:text-accent hover:bg-accent-muted/30 disabled:opacity-50 transition-colors"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
        </button>
        {/* 清除按钮 */}
        {query && !locating && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setSuggestions([])
              setError(null)
            }}
            aria-label="清除"
            className="absolute right-1 flex h-7 w-7 items-center justify-center rounded-md text-ink-quaternary hover:text-ink-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}

      {/* 搜索建议下拉 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-glass-border bg-white shadow-glass-lg dark:bg-zinc-900">
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent-muted/30 transition-colors"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink-primary truncate">{s.name}</div>
                {s.district && (
                  <div className="text-xs text-ink-tertiary truncate">{s.district}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 搜索中提示 */}
      {loading && showSuggestions && suggestions.length === 0 && (
        <div className="absolute z-50 mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border bg-white px-3 py-3 text-sm text-ink-tertiary shadow-glass-lg dark:bg-zinc-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          搜索中...
        </div>
      )}
    </div>
  )
}
