'use client'

import * as React from 'react'
import { Loader2, MapPin, Route, RefreshCw, Search, Navigation } from 'lucide-react'
import type { TripNode } from '@/types/database'

// 高德 JS API 安全密钥全局声明（2021-12-02 起必须配置）
declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string
    }
    /** InfoWindow "查看周边" button callback bridge */
    __tripMapTriggerNearby?: () => void
  }
}

interface TripMapProps {
  nodes: TripNode[]
  selectedNodeId?: string | null
  onNodeClick?: (nodeId: string) => void
  className?: string
}

// ======================== Helpers ========================

/**
 * 从 node.metadata 中提取经纬度，兼容多种字段命名：
 * - metadata.latitude / metadata.longitude
 * - metadata.lat / metadata.lng
 * - metadata.location.lat / metadata.location.lng
 * - metadata.coordinates.lat / metadata.coordinates.lng
 */
function extractLatLng(metadata: unknown): { lat: number; lng: number } | null {
  if (!metadata || typeof metadata !== 'object') return null
  const meta = metadata as Record<string, unknown>

  // 1. latitude / longitude
  const lat1 = meta.latitude
  const lng1 = meta.longitude
  if (typeof lat1 === 'number' && typeof lng1 === 'number' && lat1 && lng1) {
    return { lat: lat1, lng: lng1 }
  }

  // 2. lat / lng
  const lat2 = meta.lat
  const lng2 = meta.lng
  if (typeof lat2 === 'number' && typeof lng2 === 'number' && lat2 && lng2) {
    return { lat: lat2, lng: lng2 }
  }

  // 3. location.lat / location.lng
  const loc = meta.location
  if (loc && typeof loc === 'object') {
    const locObj = loc as Record<string, unknown>
    const lat3 = locObj.lat
    const lng3 = locObj.lng
    if (typeof lat3 === 'number' && typeof lng3 === 'number' && lat3 && lng3) {
      return { lat: lat3, lng: lng3 }
    }
  }

  // 4. coordinates.lat / coordinates.lng
  const coords = meta.coordinates
  if (coords && typeof coords === 'object') {
    const coordsObj = coords as Record<string, unknown>
    const lat4 = coordsObj.lat
    const lng4 = coordsObj.lng
    if (typeof lat4 === 'number' && typeof lng4 === 'number' && lat4 && lng4) {
      return { lat: lat4, lng: lng4 }
    }
  }

  return null
}

/** Haversine 公式计算两点间距离（米） */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 估算步行时间（分钟），按 ~80m/min（约4.8km/h） */
function estimateWalkMinutes(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const meters = haversineMeters(lat1, lng1, lat2, lng2)
  return Math.round(meters / 80)
}

/** 从 metadata 中读取评分，兼容 metadata.rating / metadata.score */
function extractRating(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null
  const meta = metadata as Record<string, unknown>
  if (typeof meta.rating === 'number') return meta.rating
  if (typeof meta.score === 'number') return meta.score
  return null
}

// ======================== Constants ========================

const COLOR_SELECTED = '#B08D57'
const COLOR_DEFAULT = '#4CAF50'
const COLOR_NEARBY = '#FF6B35'

// ======================== Component ========================

export function TripMap({ nodes, selectedNodeId, onNodeClick, className }: TripMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null)
  const mapInstance = React.useRef<any>(null)
  const AMapRef = React.useRef<any>(null)
  const markersRef = React.useRef<Map<string, any>>(new Map())
  const infoWindowRef = React.useRef<any>(null)
  const nearbyMarkersRef = React.useRef<any[]>([])
  const placeSearchRef = React.useRef<any>(null)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [retryKey, setRetryKey] = React.useState(0)
  const [nearbyActive, setNearbyActive] = React.useState(false)
  const [nearbyLoading, setNearbyLoading] = React.useState(false)

  // Stable callback refs (avoid stale closures in AMap event handlers)
  const onNodeClickRef = React.useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick
  const selectedNodeIdRef = React.useRef(selectedNodeId)
  selectedNodeIdRef.current = selectedNodeId

  const spotNodes = React.useMemo(
    () => nodes.filter((n) => n.node_type === 'spot'),
    [nodes]
  )

  const totalSpots = spotNodes.length
  const totalTransit = nodes.reduce((sum, n) => sum + (n.transit_minutes || 0), 0)

  // ---------- 步行时间提示（选中节点 ↔ 前后景点） ----------
  const walkHints = React.useMemo(() => {
    if (!selectedNodeId) return []
    const idx = spotNodes.findIndex((n) => n.id === selectedNodeId)
    if (idx === -1) return []

    const hints: { label: string; key: string }[] = []
    const curLL = extractLatLng(spotNodes[idx].metadata)
    if (!curLL) return []

    // 上一个景点 → 当前
    if (idx > 0) {
      const prevLL = extractLatLng(spotNodes[idx - 1].metadata)
      if (prevLL) {
        const mins = estimateWalkMinutes(prevLL.lat, prevLL.lng, curLL.lat, curLL.lng)
        hints.push({
          key: 'prev',
          label: `${spotNodes[idx - 1].name} → 当前 步行约 ${mins}m分钟`,
        })
      }
    }
    // 当前 → 下一个景点
    if (idx < spotNodes.length - 1) {
      const nextLL = extractLatLng(spotNodes[idx + 1].metadata)
      if (nextLL) {
        const mins = estimateWalkMinutes(curLL.lat, curLL.lng, nextLL.lat, nextLL.lng)
        hints.push({
          key: 'next',
          label: `当前 → ${spotNodes[idx + 1].name} 步行约 ${mins}m分钟`,
        })
      }
    }
    return hints
  }, [selectedNodeId, spotNodes])

  // ---------- 清除周边 POI 标记 ----------
  const clearNearbyMarkers = React.useCallback(() => {
    const map = mapInstance.current
    if (!map) return
    nearbyMarkersRef.current.forEach((m) => map.remove(m))
    nearbyMarkersRef.current = []
    setNearbyActive(false)
  }, [])

  // ---------- 周边 POI 搜索 ----------
  const searchNearby = React.useCallback(() => {
    const AMap = AMapRef.current
    const map = mapInstance.current
    if (!AMap || !map || !selectedNodeIdRef.current) return

    const node = spotNodes.find((n) => n.id === selectedNodeIdRef.current)
    if (!node) return
    const ll = extractLatLng(node.metadata)
    if (!ll) return

    // 先清除旧的周边标记
    nearbyMarkersRef.current.forEach((m) => map.remove(m))
    nearbyMarkersRef.current = []
    setNearbyLoading(true)

    if (!placeSearchRef.current) {
      placeSearchRef.current = new AMap.PlaceSearch({
        pageSize: 20,
        pageIndex: 1,
        extensions: 'all',
      })
    }

    placeSearchRef.current.searchNearBy(
      [ll.lng, ll.lat],
      1000,
      (status: string, result: any) => {
        setNearbyLoading(false)
        if (status !== 'complete' || !result?.poiList?.pois) {
          setNearbyActive(false)
          return
        }

        const pois: any[] = result.poiList.pois
        pois.forEach((poi) => {
          if (!poi.location) return
          const marker = new AMap.Marker({
            position: [poi.location.lng, poi.location.lat],
            title: poi.name,
            label: {
              content: `<div style="
                background:${COLOR_NEARBY};color:white;
                padding:1px 6px;border-radius:10px;
                font-size:10px;white-space:nowrap;
                box-shadow:0 1px 4px rgba(0,0,0,0.2);
                max-width:100px;overflow:hidden;text-overflow:ellipsis;
              ">${poi.name}</div>`,
              direction: 'top',
              offset: new AMap.Pixel(0, -4),
            },
          })

          // 点击周边 POI 显示简易信息窗
          marker.on('click', () => {
            if (infoWindowRef.current) infoWindowRef.current.close()
            const iw = new AMap.InfoWindow({
              content: `<div style="padding:6px 10px;min-width:140px;">
                <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${poi.name}</div>
                <div style="color:#888;font-size:11px;">${poi.type || ''}</div>
                ${poi.address ? `<div style="color:#666;font-size:11px;margin-top:2px;">${poi.address}</div>` : ''}
                ${poi.tel ? `<div style="color:#666;font-size:11px;">${poi.tel}</div>` : ''}
              </div>`,
              offset: new AMap.Pixel(0, -26),
            })
            iw.open(map, [poi.location.lng, poi.location.lat])
            infoWindowRef.current = iw
          })

          map.add(marker)
          nearbyMarkersRef.current.push(marker)
        })

        setNearbyActive(true)
      }
    )
  }, [spotNodes])

  // Expose for InfoWindow "查看周边" button
  React.useEffect(() => {
    window.__tripMapTriggerNearby = searchNearby
    return () => {
      delete window.__tripMapTriggerNearby
    }
  }, [searchNearby])

  // ---------- 地图初始化 ----------
  React.useEffect(() => {
    if (!mapRef.current || nodes.length === 0) {
      setLoading(false)
      return
    }

    let cancelled = false
    setError(null)
    setLoading(true)

    // 安全密钥配置（2021-12-02 起高德 JS API 2.0 要求）
    // 若未配置则降级到 1.4.15（无需安全密钥），保证地图可用
    const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE
    const jsApiVersion = securityJsCode ? '2.0' : '1.4.15'
    if (securityJsCode) {
      window._AMapSecurityConfig = {
        securityJsCode: securityJsCode,
      }
    } else {
      console.warn(
        '[TripMap] NEXT_PUBLIC_AMAP_SECURITY_JS_CODE 未配置，自动降级到 JS API 1.4.15。' +
        '如需使用 2.0 特性，请前往高德开放平台 → 应用管理 → 安全密钥 获取并配置到 .env.local。',
      )
    }

    import('@amap/amap-jsapi-loader').then(({ default: AMapLoader }) => {
      if (cancelled || !mapRef.current) return

      AMapLoader.load({
        key: process.env.NEXT_PUBLIC_AMAP_KEY!,
        version: jsApiVersion,
        plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.InfoWindow', 'AMap.PlaceSearch'],
      })
        .then((AMap: any) => {
          if (cancelled || !mapRef.current) return
          AMapRef.current = AMap

          const map = new AMap.Map(mapRef.current, {
            zoom: 12,
            viewMode: '2D',
            mapStyle: 'amap://styles/whitesmoke',
          })
          mapInstance.current = map

          const markers: any[] = []
          markersRef.current.clear()

          spotNodes.forEach((node, idx) => {
            const ll = extractLatLng(node.metadata)
            if (!ll) return
            const { lat, lng } = ll

            const isSelected = selectedNodeIdRef.current === node.id

            const marker = new AMap.Marker({
              position: [lng, lat],
              title: node.name,
              label: {
                content: `<div style="
                  background:${isSelected ? COLOR_SELECTED : COLOR_DEFAULT};
                  color:white;padding:2px 10px;border-radius:14px;
                  font-size:12px;font-weight:600;white-space:nowrap;
                  box-shadow:0 2px 8px rgba(0,0,0,0.15);
                ">${idx + 1}. ${node.name}</div>`,
                direction: 'top',
                offset: new AMap.Pixel(0, -6),
              },
              extData: node.id,
            })

            marker.on('click', () => {
              onNodeClickRef.current?.(node.id)

              // 信息弹窗 —— 包含评分、时长、查看周边按钮
              if (infoWindowRef.current) {
                infoWindowRef.current.close()
              }

              const rating = extractRating(node.metadata)
              const stars = rating ? '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)) : ''
              const ratingHtml = rating
                ? `<div style="color:#F5A623;font-size:12px;margin-bottom:2px;">${stars} <span style="color:#999;font-size:11px;">${rating.toFixed(1)}</span></div>`
                : ''

              const iw = new AMap.InfoWindow({
                content: `<div style="padding:8px 12px;min-width:180px;">
                  <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${node.name}</div>
                  ${ratingHtml}
                  <div style="color:#666;font-size:12px;">
                    ⏱ 游览约 ${node.duration_minutes} 分钟
                    ${node.transit_minutes ? ' · 🚗 交通 ' + node.transit_minutes + ' 分钟' : ''}
                  </div>
                  <button
                    onclick="window.__tripMapTriggerNearby && window.__tripMapTriggerNearby()"
                    style="
                      margin-top:8px;padding:4px 12px;
                      background:${COLOR_NEARBY};color:white;
                      border:none;border-radius:12px;
                      font-size:11px;cursor:pointer;
                      box-shadow:0 1px 4px rgba(0,0,0,0.15);
                    "
                  >查看周边</button>
                </div>`,
                offset: new AMap.Pixel(0, -30),
              })
              iw.open(map, [lng, lat])
              infoWindowRef.current = iw
            })

            map.add(marker)
            markers.push(marker)
            markersRef.current.set(node.id, marker)
          })

          // 路线连线
          const path = spotNodes
            .map((n) => {
              const ll = extractLatLng(n.metadata)
              return ll ? ([ll.lng, ll.lat] as [number, number]) : null
            })
            .filter(Boolean) as [number, number][]

          if (path.length >= 2) {
            const polyline = new AMap.Polyline({
              path,
              strokeColor: '#0071E3',
              strokeWeight: 4,
              strokeOpacity: 0.6,
              lineJoin: 'round',
              showDir: true,
            })
            map.add(polyline)
          }

          if (markers.length > 0) {
            map.setFitView(markers, false, [50, 50, 50, 50])
          }

          setLoading(false)
        })
        .catch((err: unknown) => {
          console.error('[TripMap] 加载失败:', err)
          if (!cancelled) {
            const msg = err instanceof Error ? err.message : String(err)
            setError(`地图加载失败：${msg}`)
            setLoading(false)
          }
        })
    }).catch((err: unknown) => {
      console.error('[TripMap] 加载失败:', err)
      if (!cancelled) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(`地图加载失败：${msg}`)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      mapInstance.current?.destroy()
      mapInstance.current = null
      AMapRef.current = null
      placeSearchRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, retryKey])

  // ---------- 选中节点：平移 + 缩放 + 标记高亮 ----------
  React.useEffect(() => {
    const map = mapInstance.current
    const AMap = AMapRef.current
    if (!map || !AMap) return

    // 关闭已有信息窗
    infoWindowRef.current?.close()

    // 清除周边标记
    clearNearbyMarkers()

    // 更新所有标记的 label 样式
    spotNodes.forEach((node, idx) => {
      const marker = markersRef.current.get(node.id)
      if (!marker) return
      const isSelected = selectedNodeId === node.id
      marker.setLabel({
        content: `<div style="
          background:${isSelected ? COLOR_SELECTED : COLOR_DEFAULT};
          color:white;padding:2px 10px;border-radius:14px;
          font-size:12px;font-weight:600;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
          ${isSelected ? 'border:2px solid #B08D57;' : ''}
        ">${idx + 1}. ${node.name}</div>`,
        direction: 'top',
        offset: new AMap.Pixel(0, -6),
      })
    })

    // 平移 + 缩放至 level 15
    if (selectedNodeId) {
      const node = nodes.find((n) => n.id === selectedNodeId)
      if (node) {
        const ll = extractLatLng(node.metadata)
        if (ll) {
          map.panTo([ll.lng, ll.lat])
          map.setZoom(15)
        }
      }
    }
  }, [selectedNodeId, nodes, spotNodes, clearNearbyMarkers])

  // ---------- Error UI ----------
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-xl border border-accent/20 bg-accent-muted/30 py-8 px-4 text-center ${className ?? ''}`}>
        <MapPin className="h-8 w-8 text-accent/50" />
        <span className="mt-2 max-w-md text-body-sm text-ink-tertiary">{error}</span>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-caption font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </button>
      </div>
    )
  }

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 ${className ?? ''}`}>
      {/* 地图信息栏 */}
      <div className="flex shrink-0 items-center gap-4 border-b border-gray-100 bg-white/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 text-caption text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-azure" />
          <span className="font-medium text-gray-700">{totalSpots}</span> 个景点
        </div>
        {totalTransit > 0 && (
          <div className="flex items-center gap-1.5 text-caption text-gray-500">
            <Route className="h-3.5 w-3.5 text-gray-400" />
            交通约 <span className="font-medium text-gray-700">{totalTransit}</span> 分钟
          </div>
        )}
        {selectedNodeId && (
          <div className="ml-auto text-caption text-azure">
            点击地图标记查看详情
          </div>
        )}
      </div>

      {/* 步行时间提示栏 */}
      {walkHints.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-50 bg-amber-50/60 px-4 py-1.5">
          {walkHints.map((h) => (
            <div key={h.key} className="flex items-center gap-1 text-[11px] text-amber-800/80">
              <Navigation className="h-3 w-3" />
              <span>{h.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 地图容器 */}
      <div className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        <div ref={mapRef} className="absolute inset-0" />

        {/* 周边推荐按钮（右上角） */}
        {!loading && selectedNodeId && (
          <button
            type="button"
            onClick={nearbyActive ? clearNearbyMarkers : searchNearby}
            disabled={nearbyLoading}
            className={`
              absolute right-3 top-3 z-20 inline-flex items-center gap-1.5
              rounded-full px-3 py-1.5 text-xs font-medium shadow-md
              transition-all
              ${nearbyActive
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }
              disabled:opacity-60
            `}
          >
            {nearbyLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            {nearbyActive ? '清除周边' : '周边推荐'}
          </button>
        )}
      </div>
    </div>
  )
}
