'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  Share2,
  Printer,
  Layers,
  Clock,
  Gauge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { GlassCard, GlassSectionTitle } from '@/components/glass'
import { GenerateTripDialog } from '@/components/trips/generate-trip-dialog'
import { TripTimeline } from '@/components/trip-timeline'
import { RealtimeAlertCard } from '@/components/realtime-alert-card'
import { WeatherCard } from '@/components/weather/weather-card'
import { WeatherHeroBackground } from '@/components/weather/weather-hero-background'
import { TripMap } from '@/components/trip-map'
import { exportTripToPDF, printTrip } from '@/lib/trip/export'
import {
  useTrips,
  useTrip,
  useDeleteTrip,
  useUpdateNode,
} from '@/lib/hooks/use-trips'
import { useRealtimeAlerts } from '@/lib/hooks/use-alerts'
import { useTripStore } from '@/lib/stores/trip-store'
import { detectConflicts } from '@/lib/utils/conflict'
import { toast } from '@/lib/hooks/use-toast'
import { apiFetch } from '@/lib/api/client'
import { queryKeys } from '@/lib/query/keys'
import { API_ENDPOINTS } from '@trip-ai/shared'
import { useQueryClient } from '@tanstack/react-query'
import { formatDateWithWeekday, daysBetween } from '@/lib/utils'
import type { TripListItem, GenerateTripResponse } from '@/types/api'
import type { RealtimeAlert, TripNode } from '@/types/database'

/** 稳定空数组常量，避免 `?? []` 在每次渲染时创建新引用 */
const EMPTY_NODES: import('@/types/database').Database['public']['Tables']['trip_nodes']['Row'][] = []

/** 行程状态 → Badge 颜色 */
const STATUS_VARIANT: Record<
  string,
  'default' | 'gold' | 'accent' | 'success' | 'warning' | 'outline'
> = {
  draft: 'outline',
  confirmed: 'default',
  ongoing: 'gold',
  completed: 'success',
  archived: 'warning',
}

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  ongoing: '进行中',
  completed: '已完成',
  archived: '已归档',
}

function TripsPage() {
  const t = useTranslations('trip')
  const tc = useTranslations('common')

  const searchParams = useSearchParams()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(
    () => searchParams.get('selected'),
  )
  const [exporting, setExporting] = React.useState(false)
  const [alertsExpanded, setAlertsExpanded] = React.useState(false)

  const list = useTrips()
  const detail = useTrip(selectedId ?? undefined)
  const deleteTrip = useDeleteTrip()
  const setConflicts = useTripStore((s) => s.setConflicts)
  const setCurrentTrip = useTripStore((s) => s.setCurrentTrip)
  const setNodes = useTripStore((s) => s.setNodes)
  const isGenerating = useTripStore((s) => s.isGenerating)
  const conflicts = useTripStore((s) => s.conflicts)
  const selectedNodeId = useTripStore((s) => s.selectedNodeId)
  const selectNode = useTripStore((s) => s.selectNode)
  const conflictCount = conflicts.length

  const alerts = useRealtimeAlerts(selectedId ?? undefined)
  const qc = useQueryClient()

  // ===== 备选方案替换 + 飞行动画状态 =====
  const updateNodeMutation = useUpdateNode(selectedId ?? 'none')
  /** 选中的备选方案（用户在预警卡片点击"替换"后保存） */
  const [pickedAlternative, setPickedAlternative] = React.useState<{
    alertId: string
    alternative: { name: string; rating?: string; address?: string }
    fromEl: HTMLElement
  } | null>(null)
  /** 替换选择模式：时间轴节点高亮可点击 */
  const [replacingActive, setReplacingActive] = React.useState(false)
  /** 正在 fade-out 的节点 id */
  const [replacingOutNodeId, setReplacingOutNodeId] = React.useState<string | null>(null)
  /** 飞行动画克隆元素 */
  const [flyClone, setFlyClone] = React.useState<{
    fromRect: DOMRect
    toRect: DOMRect
    content: { name: string; address?: string; rating?: string }
  } | null>(null)

  const trips = list.data ?? []

  // 选中详情后，同步到 store 并触发冲突检测
  React.useEffect(() => {
    if (!detail.data) return
    setCurrentTrip(detail.data.trip)
    setNodes(detail.data.nodes ?? [])
    setConflicts(detectConflicts(detail.data.nodes))
  }, [detail.data, setCurrentTrip, setNodes, setConflicts])

  // 退出详情视图
  const backToList = () => {
    setSelectedId(null)
    setCurrentTrip(null)
    setNodes([])
    setConflicts([])
  }

  // AI 生成成功回调 → 直接进入详情
  const handleGenerated = (res: GenerateTripResponse) => {
    list.refetch()
    setSelectedId(res.trip.id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该行程？')) return
    try {
      await deleteTrip.mutateAsync(id)
      toast({ title: '已删除行程' })
      if (selectedId === id) backToList()
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  // ===== 备选方案替换回调 =====

  /** 用户在预警卡片点击备选方案的"替换"按钮 */
  const handlePickAlternative = (
    alertId: string,
    alternative: { name: string; rating?: string; address?: string },
    fromEl: HTMLElement,
  ) => {
    setPickedAlternative({ alertId, alternative, fromEl })
    setReplacingActive(true)
  }

  /** 用户在时间轴点击要替换的节点 → 触发飞行动画 + API 更新 */
  const handleReplaceTarget = async (nodeId: string) => {
    // 空字符串表示用户点击了"取消"按钮
    if (nodeId === '') {
      resetReplacement()
      return
    }
    if (!pickedAlternative) return

    // 1. 找到源元素（备选方案 li）和目标元素（节点卡片）
    const fromEl = pickedAlternative.fromEl
    const fromRect = fromEl.getBoundingClientRect()
    const targetEl = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null
    if (!targetEl) {
      toast({ title: '找不到目标节点', variant: 'destructive' })
      resetReplacement()
      return
    }
    const toRect = targetEl.getBoundingClientRect()

    // 2. 触发原节点 fade-out
    setReplacingOutNodeId(nodeId)

    // 3. 创建飞行动画克隆体
    setFlyClone({
      fromRect,
      toRect,
      content: pickedAlternative.alternative,
    })

    // 4. 等待飞行动画完成（600ms）→ 调用 API 更新节点
    await new Promise((resolve) => setTimeout(resolve, 650))

    try {
      // 并行调用：更新节点 + 采纳预警（避免串行 await 时第二个请求卡住）
      const nodeUrl = `${API_ENDPOINTS.tripById(selectedId!)}/nodes/${nodeId}`
      const alertUrl = `${API_ENDPOINTS.tripById(selectedId!)}/alerts/${pickedAlternative.alertId}`
      console.log('[replace] 并行调用:', { nodeUrl, alertUrl })

      await Promise.all([
        apiFetch(nodeUrl, {
          method: 'PATCH',
          body: {
            name: pickedAlternative.alternative.name,
            metadata: {
              replaced_from_alert: pickedAlternative.alertId,
              replaced_at: new Date().toISOString(),
              original_address: pickedAlternative.alternative.address,
              rating: pickedAlternative.alternative.rating,
            },
          },
        }),
        apiFetch(alertUrl, {
          method: 'PATCH',
          body: { status: 'accepted' },
        }),
      ])
      console.log('[replace] 两个 API 调用均成功，刷新列表')
      // invalidate 查询，让前端数据刷新
      qc.invalidateQueries({ queryKey: queryKeys.trip(selectedId!) })
      qc.invalidateQueries({ queryKey: queryKeys.alerts(selectedId!) })
      toast({ title: '已替换节点 · 预警已采纳' })
    } catch (err) {
      console.error('[replace] 替换失败:', err)
      toast({ title: '替换失败，请重试', variant: 'destructive' })
    } finally {
      // 5. 清除所有替换状态（fly clone 会在 AnimatePresence 中 fade-out）
      resetReplacement()
    }
  }

  /** 重置所有替换状态 */
  const resetReplacement = () => {
    setFlyClone(null)
    setReplacingOutNodeId(null)
    setReplacingActive(false)
    setPickedAlternative(null)
  }

  /** 取消替换模式（用户点击其他区域或按 ESC） */
  const cancelReplacement = () => {
    if (replacingActive) resetReplacement()
  }

  // ESC 取消替换模式
  React.useEffect(() => {
    if (!replacingActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelReplacement()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replacingActive])

  // ===== 忽略预警时把 care_tip 写入关联节点 =====

  /** 根据 alert_type 找到关联的行程节点 */
  const findRelatedNode = (alert: RealtimeAlert, nodes: TripNode[]): TripNode | null => {
    const alertType = alert.alert_type as string
    // dining → meal 节点或名称含"餐"的节点；其他 → spot 节点
    if (alertType === 'dining') {
      return nodes.find((n) => n.node_type === 'meal' || /餐|午餐|晚餐|早餐|美食|饭店/.test(n.name)) ?? null
    }
    return nodes.find((n) => n.node_type === 'spot') ?? null
  }

  /** 忽略预警 + AI 生成 care_tip 并写入关联节点 */
  const handleDismissWithCareTip = async (alert: RealtimeAlert, reason?: string) => {
    const meta = (alert as any).metadata as { care_tip?: string } | null
    let careTip = meta?.care_tip ?? ''

    // 如果预警没有 care_tip，调用 AI 生成
    if (!careTip) {
      try {
        const aiRes = await apiFetch<{ careTip: string }>('/api/ai/care-tip', {
          method: 'POST',
          body: {
            alertTitle: alert.title,
            alertDescription: alert.description,
            alertType: alert.alert_type,
            destination: detail.data?.trip?.destination ?? '',
          },
        })
        careTip = aiRes.careTip || ''
      } catch (err) {
        console.error('[dismiss] AI 生成 care_tip 失败:', err)
      }
    }

    // 构建忽略预警的请求体
    const dismissBody: { status: string; dismiss_reason?: string; dismissed_at?: string } = { status: 'dismissed' }
    if (reason) {
      dismissBody.dismiss_reason = reason
      dismissBody.dismissed_at = new Date().toISOString()
    }

    // 收集并行任务
    const tasks: Promise<unknown>[] = [
      apiFetch(`${API_ENDPOINTS.tripById(selectedId!)}/alerts/${alert.id}`, {
        method: 'PATCH',
        body: dismissBody,
      }),
    ]

    // 如果有 care_tip 且有关联节点，加入写入节点 metadata 的任务
    let careTipWritten = false
    if (careTip && selectedId && detail.data?.nodes) {
      const relatedNode = findRelatedNode(alert, detail.data.nodes)
      if (relatedNode) {
        const existingMeta = (relatedNode.metadata as Record<string, unknown> | null) ?? {}
        tasks.push(
          apiFetch(`${API_ENDPOINTS.tripById(selectedId)}/nodes/${relatedNode.id}`, {
            method: 'PATCH',
            body: {
              metadata: {
                ...existingMeta,
                care_tip: careTip,
                care_tip_from_alert: alert.id,
                care_tip_generated_at: new Date().toISOString(),
              },
            },
          }),
        )
        careTipWritten = true
      }
    }

    try {
      await Promise.all(tasks)
      // 刷新查询
      qc.invalidateQueries({ queryKey: queryKeys.alerts(selectedId!) })
      if (careTipWritten) {
        qc.invalidateQueries({ queryKey: queryKeys.trip(selectedId!) })
        toast({ title: '已忽略预警 · 小贴士已写入节点' })
      } else {
        toast({ title: '已忽略预警' })
      }
    } catch (err) {
      console.error('[dismiss] 操作失败:', err)
      toast({ title: '操作失败，请重试', variant: 'destructive' })
    }
  }

  // ===== 详情视图 =====
  if (selectedId) {
    const data = detail.data
    const trip = data?.trip
    const nodes = data?.nodes ?? EMPTY_NODES

    return (
      <div className="apple-bg min-h-full">
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          {/* —— Hero: Glass strong 浮层（左右两栏：左栏文案 + 右栏天气），背景为动态天气 —— */}
          <GlassCard variant="strong" padding="default" className="relative mb-6 overflow-hidden">
            {/* 天气动态背景层：覆盖整个大卡片 */}
            {trip && (
              <WeatherHeroBackground
                location={trip.destination}
                className="pointer-events-none absolute inset-0 z-0"
              />
            )}
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between">
              {/* 左栏：返回 + 状态 + 目的地 + 出发地 + inline 小标签 */}
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={backToList}
                    className="apple-pill apple-pill-glass !px-3 !py-1.5 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {tc('back')}
                  </button>
                  {trip && (
                    <span className="rounded-full bg-azure-muted px-2.5 py-0.5 text-xs font-medium text-azure">
                      {STATUS_LABEL[trip.status] ?? trip.status}
                    </span>
                  )}
                </div>
                {detail.isLoading || !trip ? (
                  <Skeleton className="h-10 w-64" />
                ) : (
                  <h1 className="font-appleDisplay text-3xl font-semibold tracking-tight text-gray-700 dark:text-gray-900 sm:text-4xl">
                    {trip.destination}
                  </h1>
                )}
                {trip?.departure && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    从 {trip.departure} 出发
                  </p>
                )}
                {trip && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="apple-pill apple-pill-glass !px-3 !py-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateWithWeekday(trip.start_date)}
                    </span>
                    <span className="apple-pill apple-pill-glass !px-3 !py-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      {daysBetween(trip.start_date, trip.end_date)} 天
                    </span>
                    <span className="apple-pill apple-pill-glass !px-3 !py-1.5 text-xs">
                      <Users className="h-3.5 w-3.5" />
                      {trip.traveler_count} 人
                    </span>
                    <span className="apple-pill apple-pill-glass !px-3 !py-1.5 text-xs">
                      <Gauge className="h-3.5 w-3.5" />
                      {trip.pace === 'tight' ? '紧凑版' : '松弛版'}
                    </span>
                  </div>
                )}
              </div>

              {/* 右栏：天气 hero 模式（transparent，背景由大卡片提供） */}
              {trip && (
                <div className="w-full shrink-0 lg:w-[320px]">
                  <WeatherCard location={trip.destination} variant="hero" transparent />
                </div>
              )}
            </div>
            {/* 冲突 / 正常指示条 */}
            {conflictCount > 0 ? (
              <div className="relative z-10 mt-5 flex items-center gap-2 rounded-xl bg-coralWarn-muted px-4 py-2.5 text-sm text-coralWarn">
                <AlertTriangle className="h-4 w-4" />
                <span>检测到 {conflictCount} 处时间冲突，请查看时间轴标红节点</span>
              </div>
            ) : trip && nodes.length > 0 && !detail.isLoading ? (
              <div className="relative z-10 mt-5 flex items-center gap-2 rounded-xl bg-mintOk-muted px-4 py-2.5 text-sm text-mintOk">
                <CheckCircle2 className="h-4 w-4" />
                <span>无冲突，行程安排合理</span>
              </div>
            ) : null}
          </GlassCard>

          {/* —— 操作栏 —— */}
          {trip && nodes.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="apple-pill apple-pill-glass"
                disabled={exporting}
                onClick={async () => {
                  setExporting(true)
                  try {
                    await exportTripToPDF({ trip: trip as any, nodes: nodes as any[], format: 'pdf' })
                    toast({ title: 'PDF 导出成功' })
                  } catch {
                    toast({ title: '导出失败，请重试' })
                  } finally {
                    setExporting(false)
                  }
                }}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                导出 PDF
              </button>
              <button
                type="button"
                className="apple-pill apple-pill-glass"
                onClick={() => printTrip(trip as any, nodes as any[])}
              >
                <Printer className="h-4 w-4" />
                打印
              </button>
              <button
                type="button"
                className="apple-pill apple-pill-glass"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/trips?selected=${trip.id}`
                  navigator.clipboard.writeText(shareUrl)
                  toast({ title: '分享链接已复制' })
                }}
              >
                <Share2 className="h-4 w-4" />
                分享
              </button>
              <div className="ml-auto apple-pill apple-pill-glass !cursor-default">
                <Layers className="h-4 w-4" />
                {nodes.length} 节点
              </div>
            </div>
          )}

          {/* —— 地图 —— */}
          {trip && nodes.length > 0 && !detail.isLoading && (
            <GlassCard padding="none" className="mb-6 overflow-hidden">
              <TripMap
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onNodeClick={(id) => selectNode(selectedNodeId === id ? null : id)}
                className="h-[320px] w-full"
              />
            </GlassCard>
          )}

          {/* —— 主内容：时间轴 + 预警侧栏（加宽到 360px） —— */}
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* 左：时间轴（max-h + Apple 细滚动条，防止过长拉低页面） */}
            <div>
              <GlassSectionTitle className="mb-3">行程时间轴</GlassSectionTitle>
              <GlassCard padding="default" className="apple-scrollbar max-h-[700px] overflow-y-auto">
                {detail.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-body text-ink-quaternary">{t('noNodes')}</p>
                  </div>
                ) : (
                  <TripTimeline
                    tripId={selectedId}
                    nodes={nodes}
                    onAddNode={() => setDialogOpen(true)}
                    replacingActive={replacingActive}
                    replacingOutNodeId={replacingOutNodeId}
                    onReplaceTarget={handleReplaceTarget}
                    destination={trip?.destination}
                  />
                )}
              </GlassCard>
            </div>

            {/* 右：预警（天气已并入 Hero） */}
            <aside className="space-y-5">
              <div>
                <GlassSectionTitle
                  className="mb-3"
                  action={
                    alerts.alerts.length > 0 ? (
                      <span className="rounded-full bg-coralWarn-muted px-2 py-0.5 text-xs font-medium text-coralWarn">
                        {alerts.alerts.length}
                      </span>
                    ) : null
                  }
                >
                  实时预警
                </GlassSectionTitle>
                {alerts.alerts.length === 0 ? (
                  <GlassCard variant="subtle" padding="compact" className="text-center text-sm text-gray-400">
                    暂无预警
                  </GlassCard>
                ) : (
                  <div className="apple-scrollbar max-h-[600px] overflow-y-auto pr-1">
                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {alerts.alerts
                          .slice(0, alertsExpanded ? undefined : 3)
                          .map((alert) => (
                            <RealtimeAlertCard
                              key={alert.id}
                              alert={alert}
                              destination={trip?.destination}
                              onAccept={alerts.acceptSuggestion}
                              onDismiss={(alertId, reason) => {
                                // 找到该预警，把 care_tip 写入关联节点
                                const alert = alerts.alerts.find((a) => a.id === alertId)
                                if (alert) {
                                  handleDismissWithCareTip(alert, reason)
                                } else {
                                  alerts.dismissAlert(alertId, reason)
                                }
                              }}
                              onPickAlternative={handlePickAlternative}
                              replacingActive={replacingActive}
                            />
                          ))}
                      </AnimatePresence>
                    </div>
                    {alerts.alerts.length > 3 && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setAlertsExpanded((v) => !v)}
                          className="apple-pill apple-pill-glass !px-4 !py-1.5 text-xs"
                        >
                          {alertsExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              收起
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              查看全部 {alerts.alerts.length} 条
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* —— 飞行动画克隆元素：备选方案从预警卡片飞到时间轴节点 —— */}
        <AnimatePresence>
          {flyClone && (
            <motion.div
              initial={{
                position: 'fixed',
                left: flyClone.fromRect.left,
                top: flyClone.fromRect.top,
                width: flyClone.fromRect.width,
                height: flyClone.fromRect.height,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                left: flyClone.toRect.left,
                top: flyClone.toRect.top,
                width: flyClone.toRect.width,
                height: flyClone.toRect.height,
                opacity: [1, 1, 0.9],
                scale: [1, 1.02, 1],
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1],
                times: [0, 0.7, 1],
              }}
              className="pointer-events-none z-50 overflow-hidden rounded-xl border border-accent bg-white shadow-2xl shadow-accent/30"
            >
              <div className="flex h-full w-full items-center gap-2 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-muted">
                  <MapPin className="h-4 w-4 text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-700">
                    {flyClone.content.name}
                  </div>
                  {flyClone.content.address && (
                    <div className="truncate text-xs text-gray-400">
                      {flyClone.content.address}
                    </div>
                  )}
                </div>
                {flyClone.content.rating && flyClone.content.rating !== '0' && (
                  <span className="shrink-0 rounded-full bg-amberCaution-muted px-2 py-0.5 text-[10px] font-semibold text-amberCaution">
                    ★ {flyClone.content.rating}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <GenerateTripDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onGenerated={handleGenerated}
        />
      </div>
    )
  }

  // ===== 列表视图 =====
  return (
    <div className="mx-auto w-full max-w-[960px] p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h2">{t('title')}</h1>
          <p className="mt-2 text-body text-ink-tertiary">{t('subtitle')}</p>
        </div>
        <Button
          variant="accent"
          className="shrink-0"
          onClick={() => setDialogOpen(true)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t('create')}
        </Button>
      </div>

      {/* 列表 */}
      <div className="mt-6">
        {list.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            message={t('empty')}
            cta={
              <Button variant="default" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('create')}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onSelect={() => setSelectedId(trip.id)}
                onDelete={() => handleDelete(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      <GenerateTripDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGenerated={handleGenerated}
      />
    </div>
  )
}

/** 行程卡片 */
function TripCard({
  trip,
  onSelect,
  onDelete,
}: {
  trip: TripListItem
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card
        className="cursor-pointer"
        onClick={onSelect}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1.5 text-body-lg font-medium text-ink-primary">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <span className="truncate">{trip.destination}</span>
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-tertiary">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateWithWeekday(trip.start_date)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {trip.traveler_count} 人
                </span>
                {typeof trip.node_count === 'number' && (
                  <span>{trip.node_count} 节点</span>
                )}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[trip.status] ?? 'outline'}>
              {STATUS_LABEL[trip.status] ?? trip.status}
            </Badge>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-caption text-ink-quaternary">
              {daysBetween(trip.start_date, trip.end_date)} 天 ·{' '}
              {trip.pace === 'tight' ? '紧凑' : '松弛'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="text-caption text-ink-quaternary transition-colors hover:text-danger"
            >
              删除
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** 空状态 */
function EmptyState({
  message,
  cta,
}: {
  message: string
  cta?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted">
        <MapPin className="h-7 w-7 text-accent" />
      </div>
      <p className="text-body text-ink-tertiary">{message}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )
}

/** 包装导出：useSearchParams 需要 Suspense 边界 */
export default function TripsPageWithSuspense() {
  return (
    <React.Suspense fallback={<div className="mx-auto w-full max-w-[960px] p-6"><Skeleton className="h-32 w-full rounded-lg" /></div>}>
      <TripsPage />
    </React.Suspense>
  )
}
