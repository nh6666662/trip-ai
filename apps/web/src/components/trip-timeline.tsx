'use client'

import * as React from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import {
  MapPin,
  Utensils,
  Coffee,
  Bus,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  ChevronRight,
  ArrowRight,
  Heart,
  Loader2,
  Toilet,
  Car,
  Footprints,
  Bike,
  Train,
  Navigation,
} from 'lucide-react'
import { cn, formatTime, formatDuration } from '@/lib/utils'
import { useTripStore } from '@/lib/stores/trip-store'
import { useReorderNodes, useDeleteNode, useUpdateNode } from '@/lib/hooks/use-trips'
import { toast } from '@/lib/hooks/use-toast'
import { detectConflicts } from '@/lib/utils/conflict'
import { Button } from '@/components/ui/button'
import type { TripNode } from '@/types/database'

/** 节点类型 → 图标 + 颜色 + 标签 */
const NODE_META: Record<
  string,
  { icon: typeof MapPin; color: string; bg: string; border: string; label: string }
> = {
  spot: { icon: MapPin, color: 'text-accent', bg: 'bg-accent-muted', border: 'border-accent-muted', label: '景点' },
  meal: { icon: Utensils, color: 'text-gold', bg: 'bg-gold-muted', border: 'border-gold-light', label: '餐饮' },
  rest: { icon: Coffee, color: 'text-mintOk', bg: 'bg-mintOk-muted', border: 'border-mintOk/20', label: '休息' },
  transit: { icon: Bus, color: 'text-azure', bg: 'bg-azure-muted', border: 'border-azure/20', label: '交通' },
  custom: { icon: Circle, color: 'text-ink-secondary', bg: 'bg-surface-muted', border: 'border-border', label: '自定义' },
}

/** 交通方式 → 图标 + 中文标签 */
const TRANSIT_MODES: Record<
  string,
  { icon: typeof Car; label: string; color: string }
> = {
  driving: { icon: Car, label: '驾车', color: 'text-azure' },
  walking: { icon: Footprints, label: '步行', color: 'text-mintOk' },
  bicycling: { icon: Bike, label: '骑行', color: 'text-mintOk' },
  transit: { icon: Bus, label: '公交', color: 'text-azure' },
  train: { icon: Train, label: '火车', color: 'text-accent' },
  high_speed_rail: { icon: Train, label: '高铁', color: 'text-accent' },
  plane: { icon: Navigation, label: '飞机', color: 'text-accent' },
  taxi: { icon: Car, label: '出租', color: 'text-azure' },
}

/** 从节点 metadata 解析交通方式 */
function getTransitMode(node: TripNode): { icon: typeof Car; label: string; color: string } | null {
  const meta = node.metadata as Record<string, unknown> | null
  const mode = (meta?.transit_mode as string) ?? ''
  if (mode && TRANSIT_MODES[mode]) return TRANSIT_MODES[mode]
  // 名称启发式识别
  const name = node.name || ''
  if (/高铁|动车/.test(name)) return TRANSIT_MODES.high_speed_rail
  if (/火车/.test(name)) return TRANSIT_MODES.train
  if (/飞机|航班|机场/.test(name)) return TRANSIT_MODES.plane
  if (/步行|走路/.test(name)) return TRANSIT_MODES.walking
  if (/骑行|单车|自行车/.test(name)) return TRANSIT_MODES.bicycling
  if (/公交|地铁/.test(name)) return TRANSIT_MODES.transit
  if (/出租|打车|滴滴/.test(name)) return TRANSIT_MODES.taxi
  if (/驾车|开车|自驾/.test(name)) return TRANSIT_MODES.driving
  return null
}

/**
 * 根据 transit_minutes 智能推断交通方式（无显式 mode 时的兜底）
 * - < 5min: 步行
 * - 5-15min: 公交/打车
 * - 15-60min: 驾车
 * - > 60min: 高铁/火车
 */
function guessTransitModeByTime(transitMinutes: number): { icon: typeof Car; label: string; color: string } | null {
  if (transitMinutes <= 0) return null
  if (transitMinutes < 5) return TRANSIT_MODES.walking
  if (transitMinutes <= 15) return TRANSIT_MODES.transit
  if (transitMinutes <= 60) return TRANSIT_MODES.driving
  return TRANSIT_MODES.high_speed_rail
}

interface TripTimelineProps {
  tripId: string
  nodes: TripNode[]
  now?: Date
  onAddNode?: () => void
  selectedNodeId?: string | null
  onSelectNode?: (id: string | null) => void
  /** 替换模式：是否激活节点选择 */
  replacingActive?: boolean
  /** 替换中：正在 fade-out 的节点 id */
  replacingOutNodeId?: string | null
  /** 替换模式：用户点击节点确认替换 */
  onReplaceTarget?: (nodeId: string) => void
  /** 行程目的地城市名（用于搜索附近餐厅） */
  destination?: string
}

export function TripTimeline({
  tripId,
  nodes,
  now,
  onAddNode,
  selectedNodeId: externalSelectedId,
  onSelectNode,
  replacingActive,
  replacingOutNodeId,
  onReplaceTarget,
  destination,
}: TripTimelineProps) {
  const reorderMutation = useReorderNodes(tripId)
  const deleteNode = useDeleteNode(tripId)
  const storeSetNodes = useTripStore((s) => s.setNodes)
  const storeConflicts = useTripStore((s) => s.conflicts)
  const storeSetConflicts = useTripStore((s) => s.setConflicts)
  const internalSelectedId = useTripStore((s) => s.selectedNodeId)
  const storeSelectNode = useTripStore((s) => s.selectNode)

  const selectedNodeId = externalSelectedId ?? internalSelectedId
  const selectNode = onSelectNode ?? storeSelectNode

  const current = now ?? new Date()
  const [isEditing, setIsEditing] = React.useState(false)
  const [localNodes, setLocalNodes] = React.useState<TripNode[]>(nodes)
  const [localConflicts, setLocalConflicts] = React.useState<ReturnType<typeof detectConflicts>>([])

  // 同步外部节点
  React.useEffect(() => {
    setLocalNodes(nodes)
    storeSetNodes(nodes)
  }, [nodes, storeSetNodes])

  // 进入编辑模式时，保存当前节点快照
  const enterEdit = () => {
    setLocalNodes([...nodes])
    setLocalConflicts([])
    setIsEditing(true)
  }

  // 取消编辑：恢复原始节点
  const cancelEdit = () => {
    setLocalNodes([...nodes])
    setLocalConflicts([])
    setIsEditing(false)
  }

  // 保存编辑：发送排序请求 + 检测冲突
  const saveEdit = () => {
    const ordered = localNodes.map((n, i) => ({ ...n, sort_order: i }))
    storeSetNodes(ordered)

    // 检测冲突
    const conflicts = detectConflicts(ordered)
    storeSetConflicts(conflicts)
    setLocalConflicts(conflicts)

    // 发送排序请求
    reorderMutation.mutate(
      ordered.map((n) => n.id),
      {
        onSuccess: () => {
          toast({
            title: conflicts.length > 0
              ? `已保存，发现 ${conflicts.length} 个时间冲突`
              : '行程已保存',
          })
        },
        onError: () => {
          toast({ title: '保存失败，请重试', variant: 'destructive' })
          setLocalNodes([...nodes])
        },
      }
    )
    setIsEditing(false)
  }

  // 编辑模式下的拖拽重排
  const handleReorder = (reordered: TripNode[]) => {
    setLocalNodes(reordered)
    // 实时检测冲突（仅编辑模式下显示）
    const conflicts = detectConflicts(reordered.map((n, i) => ({ ...n, sort_order: i })))
    setLocalConflicts(conflicts)
  }

  // 删除节点
  const handleDelete = (nodeId: string) => {
    if (isEditing) {
      setLocalNodes((prev) => prev.filter((n) => n.id !== nodeId))
    } else {
      deleteNode.mutate(nodeId)
      toast({ title: '已删除节点' })
    }
  }

  // 按天分组
  const groupedNodes = React.useMemo(() => {
    const displayNodes = isEditing ? localNodes : nodes
    const groups: { day: number; nodes: { node: TripNode; globalIdx: number }[] }[] = []
    let currentDay = -1

    displayNodes.forEach((node, idx) => {
      const meta = node.metadata as Record<string, unknown> | null
      const day = (meta?.day as number) ?? Math.floor(idx / 4) + 1

      if (day !== currentDay) {
        currentDay = day
        groups.push({ day, nodes: [] })
      }
      groups[groups.length - 1].nodes.push({ node, globalIdx: idx })
    })

    return groups
  }, [nodes, localNodes, isEditing])

  const displayNodes = isEditing ? localNodes : nodes
  const displayConflicts = isEditing ? localConflicts : storeConflicts

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-muted/50 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted">
          <MapPin className="h-6 w-6 text-accent" />
        </div>
        <p className="mt-4 text-body font-medium text-ink-secondary">还没有行程节点</p>
        <p className="mt-1 text-caption text-ink-quaternary">使用 AI 生成行程或手动添加节点</p>
        {onAddNode && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onAddNode}>
            <Plus className="mr-1 h-4 w-4" />
            添加节点
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* 编辑/保存控制栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-amberCaution-muted px-3 py-1 text-caption font-medium text-amberCaution"
            >
              <Pencil className="h-3 w-3" />
              编辑中 · 拖拽调整顺序
            </motion.span>
          )}
          {displayConflicts.length > 0 && !isEditing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning)]/10 px-3 py-1 text-caption font-medium text-[var(--warning)]">
              <AlertTriangle className="h-3 w-3" />
              {displayConflicts.length} 个冲突
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onAddNode && !isEditing && (
            <Button variant="ghost" size="sm" onClick={onAddNode}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              添加
            </Button>
          )}
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={reorderMutation.isPending}>
                <X className="mr-1 h-3.5 w-3.5" />
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveEdit}
                disabled={reorderMutation.isPending}
              >
                {reorderMutation.isPending ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Clock className="h-3.5 w-3.5" />
                  </motion.div>
                ) : (
                  <Check className="mr-1 h-3.5 w-3.5" />
                )}
                保存
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={enterEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              编辑
            </Button>
          )}
        </div>
      </div>

      {/* 编辑模式：扁平 Reorder.Group，拖拽可跨天 */}
      {isEditing ? (
        <Reorder.Group
          axis="y"
          values={localNodes}
          onReorder={handleReorder}
          className="space-y-2"
        >
          {localNodes.map((node, idx) => {
            const meta = node.metadata as Record<string, unknown> | null
            const day = (meta?.day as number) ?? Math.floor(idx / 4) + 1
            const prevNode = idx > 0 ? localNodes[idx - 1] : null
            const prevDay = prevNode
              ? ((prevNode.metadata as Record<string, unknown> | null)?.day as number) ?? Math.floor((idx - 1) / 4) + 1
              : -1
            const showDayHeader = day !== prevDay

            return (
              <React.Fragment key={node.id}>
                {showDayHeader && (
                  <div className="flex items-center gap-3 pt-2" style={{ order: -1 }}>
                    <div className="flex h-7 items-center rounded-full bg-accent px-3 text-caption font-semibold text-white">
                      Day {day}
                    </div>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <Reorder.Item
                  value={node}
                  id={node.id}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <NodeCard
                    node={node}
                    isEditing
                    conflict={localConflicts.find((c) => c.nodeId === node.id)}
                    isSelected={selectedNodeId === node.id}
                    onSelect={() => selectNode(selectedNodeId === node.id ? null : node.id)}
                    onDelete={() => handleDelete(node.id)}
                  />
                </Reorder.Item>
              </React.Fragment>
            )
          })}
        </Reorder.Group>
      ) : (
        /* 查看模式：按天分组展示 */
        <div className="space-y-6">
          {replacingActive && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-muted/20 px-3 py-2 text-xs text-accent"
            >
              <span>
                <span className="font-semibold">选择要替换的节点：</span>
                点击高亮的景点节点，用备选方案替换它
              </span>
              <button
                type="button"
                onClick={() => onReplaceTarget?.('')}
                className="shrink-0 rounded-full bg-white/60 px-2.5 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
              >
                取消
              </button>
            </motion.div>
          )}
          {groupedNodes.map((group) => (
            <div key={group.day}>
              {/* 日期标题 */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-7 items-center rounded-full bg-accent px-3 text-caption font-semibold text-white">
                  Day {group.day}
                </div>
                <div className="h-px flex-1 bg-border" />
                <span className="text-caption text-ink-quaternary">
                  {group.nodes.length} 个节点
                </span>
              </div>

              <div className="space-y-2">
                {group.nodes.map(({ node }, i) => {
                  const conflict = displayConflicts.find((c) => c.nodeId === node.id)
                  const nextNode = group.nodes[i + 1]?.node

                  return (
                    <React.Fragment key={node.id}>
                      <NodeCard
                        node={node}
                        conflict={conflict}
                        isSelected={selectedNodeId === node.id}
                        onSelect={() => selectNode(selectedNodeId === node.id ? null : node.id)}
                        onDelete={() => handleDelete(node.id)}
                        onAddNode={onAddNode}
                        replacingActive={replacingActive && node.node_type === 'spot'}
                        replacingOut={replacingOutNodeId === node.id}
                        onReplaceTarget={() => onReplaceTarget?.(node.id)}
                        destination={destination}
                      />
                      {/* 节点间的交通指示 */}
                      {nextNode && node.transit_minutes > 0 && (() => {
                        const nodeMeta = node.metadata as Record<string, unknown> | null
                        const nextMode = (nodeMeta?.next_transit_mode as string) ?? ''
                        // 优先用显式 mode，否则按时间智能推断
                        const mode = nextMode ? TRANSIT_MODES[nextMode] : guessTransitModeByTime(node.transit_minutes)
                        const ModeIcon = mode?.icon ?? ArrowRight
                        return (
                          <div className="flex items-center gap-2 py-1 pl-6 text-caption text-ink-quaternary">
                            <ModeIcon className={cn('h-3 w-3', mode?.color ?? '')} />
                            <span>
                              {mode ? `${mode.label} ` : '交通'}约 {node.transit_minutes} 分钟
                            </span>
                          </div>
                        )
                      })()}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== 节点卡片组件 =====

interface NodeCardProps {
  node: TripNode
  isEditing?: boolean
  conflict?: { nodeId: string; type: string; message: string; severity: string }
  isSelected?: boolean
  onSelect?: () => void
  onDelete?: () => void
  onAddNode?: () => void
  /** 替换模式：是否高亮可点击替换 */
  replacingActive?: boolean
  /** 替换模式：是否正在被替换（fade-out） */
  replacingOut?: boolean
  /** 替换模式：点击节点确认替换 */
  onReplaceTarget?: () => void
  /** 行程目的地城市名（用于搜索附近餐厅） */
  destination?: string
}

function NodeCard({
  node,
  isEditing,
  conflict,
  isSelected,
  onSelect,
  onDelete,
  onAddNode,
  replacingActive,
  replacingOut,
  onReplaceTarget,
  destination,
}: NodeCardProps) {
  const meta = NODE_META[node.node_type] ?? NODE_META.custom
  const Icon = meta.icon

  // ===== meal 节点搜索餐厅（支持餐品类型筛选） =====
  const updateNodeMutation = useUpdateNode(node.trip_id)
  const [showMealSearch, setShowMealSearch] = React.useState(false)
  const [mealResults, setMealResults] = React.useState<
    { name: string; address?: string; location?: { lat: number; lng: number } }[]
  >([])
  const [mealLoading, setMealLoading] = React.useState(false)
  const [mealCategory, setMealCategory] = React.useState<string>('')

  // 餐品类型选项（中文关键词 + 高德 POI 类型码）
  const MEAL_CATEGORIES = [
    { key: '', label: '综合', keywords: '美食' },
    { key: 'chuan', label: '川菜', keywords: '川菜' },
    { key: 'huo', label: '火锅', keywords: '火锅' },
    { key: 'kuaican', label: '快餐', keywords: '快餐' },
    { key: 'mian', label: '面食', keywords: '面馆 面食' },
    { key: 'shaokao', label: '烧烤', keywords: '烧烤' },
    { key: 'ri', label: '日料', keywords: '日本料理 日料' },
    { key: 'xi', label: '西餐', keywords: '西餐' },
    { key: 'xiaochi', label: '小吃', keywords: '小吃 特色小吃' },
  ]

  const handleSearchMeal = async (categoryKey?: string) => {
    // 切换显示
    if (categoryKey === undefined) {
      setShowMealSearch((v) => !v)
      return
    }
    setMealCategory(categoryKey)
    setMealLoading(true)
    setMealResults([])
    try {
      const cat = MEAL_CATEGORIES.find((c) => c.key === categoryKey)
      const keywords = `${cat?.keywords ?? '美食'} ${destination ?? ''}`.trim()
      const res = await fetch(
        `/api/places/search?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(destination ?? '')}`,
      )
      if (!res.ok) throw new Error('搜索失败')
      const data = await res.json()
      setMealResults(Array.isArray(data) ? data.slice(0, 6) : [])
    } catch {
      toast({ title: '餐厅搜索失败', variant: 'destructive' })
    } finally {
      setMealLoading(false)
    }
  }

  const handlePickMeal = async (place: { name: string; address?: string; location?: { lat: number; lng: number } }) => {
    try {
      const existingMeta = (node.metadata as Record<string, unknown> | null) ?? {}
      await updateNodeMutation.mutateAsync({
        nodeId: node.id,
        patch: {
          name: place.name,
          metadata: {
            ...existingMeta,
            spot_address: place.address,
            spot_location: place.location,
            meal_category: mealCategory || '综合',
            enriched_at: new Date().toISOString(),
          },
        },
      })
      toast({ title: '已更新餐厅' })
      setShowMealSearch(false)
    } catch {
      toast({ title: '更新失败', variant: 'destructive' })
    }
  }

  // ===== rest 节点搜索最近公共厕所 =====
  const [showToilet, setShowToilet] = React.useState(false)
  const [toiletResults, setToiletResults] = React.useState<
    { name: string; address?: string; location?: { lat: number; lng: number }; distance?: number }[]
  >([])
  const [toiletLoading, setToiletLoading] = React.useState(false)

  const handleSearchToilet = async () => {
    // 已有结果则切换显示
    if (toiletResults.length > 0) {
      setShowToilet((v) => !v)
      return
    }
    setShowToilet(true)
    setToiletLoading(true)
    try {
      // 优先用节点 spot_location 周边搜索，否则用城市名搜索
      const nodeMeta = node.metadata as Record<string, unknown> | null
      const nodeLoc = nodeMeta?.spot_location as { lat: number; lng: number } | undefined
      let url: string
      if (nodeLoc && typeof nodeLoc.lat === 'number' && typeof nodeLoc.lng === 'number') {
        // 周边搜索：200300 = 公共厕所
        url = `/api/places/around?location=${nodeLoc.lng},${nodeLoc.lat}&types=200300&radius=1500&city=${encodeURIComponent(destination ?? '')}`
      } else {
        // 城市搜索
        url = `/api/places/search?keywords=${encodeURIComponent(`公共厕所 ${destination ?? ''}`)}&city=${encodeURIComponent(destination ?? '')}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('搜索失败')
      const data = await res.json()
      const list = Array.isArray(data) ? data.slice(0, 4) : []
      // 计算距离（如果有节点位置）
      if (nodeLoc) {
        list.forEach((item: any) => {
          if (item.location) {
            const dx = (item.location.lng ?? 0) - nodeLoc.lng
            const dy = (item.location.lat ?? 0) - nodeLoc.lat
            item.distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 111000)
          }
        })
        // 按距离排序
        list.sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      }
      setToiletResults(list)
    } catch {
      toast({ title: '公共厕所搜索失败', variant: 'destructive' })
    } finally {
      setToiletLoading(false)
    }
  }

  const handlePickToilet = async (place: { name: string; address?: string; location?: { lat: number; lng: number } }) => {
    try {
      const existingMeta = (node.metadata as Record<string, unknown> | null) ?? {}
      await updateNodeMutation.mutateAsync({
        nodeId: node.id,
        patch: {
          metadata: {
            ...existingMeta,
            nearest_toilet: {
              name: place.name,
              address: place.address,
              location: place.location,
            },
            toilet_added_at: new Date().toISOString(),
          },
        },
      })
      toast({ title: '已标记最近公共厕所' })
      setShowToilet(false)
    } catch {
      toast({ title: '更新失败', variant: 'destructive' })
    }
  }

  // ===== rest 节点 AI 推荐休息点 =====
  const [showRestSpots, setShowRestSpots] = React.useState(false)
  const [restSpots, setRestSpots] = React.useState<
    { name: string; reason?: string; type?: string; address?: string; location?: { lat: number; lng: number }; distance?: number }[]
  >([])
  const [restLoading, setRestLoading] = React.useState(false)

  const handleSearchRestSpots = async () => {
    // 已有结果则切换显示
    if (restSpots.length > 0) {
      setShowRestSpots((v) => !v)
      return
    }
    setShowRestSpots(true)
    setRestLoading(true)
    try {
      const nodeMeta = node.metadata as Record<string, unknown> | null
      const nodeLoc = nodeMeta?.spot_location as { lat: number; lng: number } | undefined
      const res = await fetch('/api/ai/rest-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          spotName: node.name,
          spotLocation: nodeLoc,
        }),
      })
      if (!res.ok) throw new Error('搜索失败')
      const data = await res.json()
      setRestSpots(Array.isArray(data.spots) ? data.spots.slice(0, 6) : [])
    } catch {
      toast({ title: '休息点推荐失败', variant: 'destructive' })
    } finally {
      setRestLoading(false)
    }
  }

  const handlePickRestSpot = async (spot: { name: string; address?: string; location?: { lat: number; lng: number }; type?: string; reason?: string }) => {
    try {
      const existingMeta = (node.metadata as Record<string, unknown> | null) ?? {}
      await updateNodeMutation.mutateAsync({
        nodeId: node.id,
        patch: {
          name: spot.name,
          metadata: {
            ...existingMeta,
            rest_spot: {
              name: spot.name,
              type: spot.type,
              reason: spot.reason,
              address: spot.address,
              location: spot.location,
            },
            rest_spot_added_at: new Date().toISOString(),
          },
        },
      })
      toast({ title: '已设置休息点' })
      setShowRestSpots(false)
    } catch {
      toast({ title: '更新失败', variant: 'destructive' })
    }
  }

  return (
    <motion.div
      layout
      data-node-id={node.id}
      initial={{ opacity: 0, y: 8 }}
      animate={
        replacingOut
          ? { opacity: 0, scale: 0.85, y: -10 }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative rounded-xl border bg-surface-elevated p-4 transition-all',
        isSelected && !isEditing && 'border-accent-muted ring-2 ring-accent-muted shadow-sm',
        !isSelected && !isEditing && 'border-border hover:border-border hover:shadow-sm',
        isEditing && 'border-amberCaution/30 bg-amberCaution-muted shadow-xs',
        conflict && !isEditing && (
          conflict.severity === 'error'
            ? 'border-[var(--danger)]/40 bg-[var(--danger)]/5'
            : 'border-[var(--warning)]/40 bg-[var(--warning)]/5'
        ),
        // 替换模式：高亮可点击
        replacingActive && 'border-accent ring-2 ring-accent/40 cursor-pointer hover:scale-[1.02] hover:shadow-md animate-pulse',
        // 替换中：fade-out
        replacingOut && 'pointer-events-none',
      )}
      onClick={(e) => {
        if (replacingActive && onReplaceTarget) {
          e.stopPropagation()
          onReplaceTarget()
          return
        }
        onSelect?.()
      }}
    >
      {/* 替换模式提示 */}
      {replacingActive && (
        <div className="absolute -top-2 left-3 z-10 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          点击替换
        </div>
      )}
      <div className="flex items-start gap-3">
        {/* 类型图标 */}
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          meta.bg, meta.border, 'border'
        )}>
          <Icon className={cn('h-5 w-5', meta.color)} />
        </div>

        {/* 内容区 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-body-sm font-semibold text-ink-primary">
              {node.name}
            </h4>
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
              meta.bg, meta.color
            )}>
              {meta.label}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-tertiary">
            <span className="inline-flex items-center gap-1 font-medium text-ink-secondary">
              <Clock className="h-3 w-3" />
              {formatTime(node.start_time)}
            </span>
            <span>{formatDuration(node.duration_minutes)}</span>
            {/* 交通方式标签（transit 节点显示） */}
            {!isEditing && node.node_type === 'transit' && (() => {
              const mode = getTransitMode(node)
              if (!mode) return null
              const ModeIcon = mode.icon
              return (
                <span className={cn('inline-flex items-center gap-1 rounded-full bg-azure-muted/50 px-2 py-0.5 font-medium', mode.color)}>
                  <ModeIcon className="h-3 w-3" />
                  {mode.label}
                </span>
              )
            })()}
            {/* 普通节点：显示到下一节点的交通方式和时间 */}
            {node.transit_minutes > 0 && !isEditing && node.node_type !== 'transit' && (() => {
              // 从节点 metadata 读取到下一节点的交通方式
              const nodeMeta = node.metadata as Record<string, unknown> | null
              const nextMode = (nodeMeta?.next_transit_mode as string) ?? ''
              // 优先用显式 mode，否则按时间智能推断
              const mode = nextMode ? TRANSIT_MODES[nextMode] : guessTransitModeByTime(node.transit_minutes)
              if (mode) {
                const ModeIcon = mode.icon
                return (
                  <span className="inline-flex items-center gap-1 text-ink-quaternary">
                    <ModeIcon className={cn('h-3 w-3', mode.color)} />
                    {mode.label} {node.transit_minutes}min
                  </span>
                )
              }
              return <span className="text-ink-quaternary">→ 交通 {node.transit_minutes}min</span>
            })()}
            {/* transit 节点显示耗时 */}
            {node.node_type === 'transit' && node.transit_minutes > 0 && !isEditing && (
              <span className="text-ink-quaternary">约 {node.transit_minutes}min</span>
            )}
          </div>

          {/* 冲突提示 */}
          {conflict && !isEditing && (
            <div className={cn(
              'mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-caption',
              conflict.severity === 'error'
                ? 'bg-[var(--danger)]/10 text-danger'
                : 'bg-[var(--warning)]/10 text-[var(--warning)]'
            )}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{conflict.message}</span>
            </div>
          )}

          {/* 出行小贴士（来自已忽略的预警，持久化显示在节点上） */}
          {(() => {
            const nodeMeta = node.metadata as Record<string, unknown> | null
            const tip = (nodeMeta?.care_tip as string) ?? ''
            if (!tip || isEditing) return null
            return (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-mintOk-muted/50 px-2.5 py-1.5 text-caption text-mintOk">
                <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{tip}</span>
              </div>
            )
          })()}

          {/* meal 节点搜索餐厅结果（含餐品类型筛选） */}
          {showMealSearch && !isEditing && (
            <div className="mt-2 space-y-2 rounded-lg bg-gold-muted/30 p-2">
              <div className="flex items-center justify-between">
                <div className="text-caption font-medium text-gold">附近推荐餐厅</div>
                {mealCategory && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-gold">
                    {MEAL_CATEGORIES.find((c) => c.key === mealCategory)?.label ?? '综合'}
                  </span>
                )}
              </div>
              {/* 餐品类型选择器 */}
              <div className="flex flex-wrap gap-1">
                {MEAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key || 'all'}
                    onClick={(e) => { e.stopPropagation(); handleSearchMeal(cat.key) }}
                    disabled={mealLoading}
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                      mealCategory === cat.key
                        ? 'bg-gold text-white'
                        : 'bg-white/60 text-ink-tertiary hover:bg-white hover:text-gold'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {mealLoading && (
                <div className="flex items-center gap-1.5 py-2 text-caption text-ink-tertiary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  搜索中...
                </div>
              )}
              {!mealLoading && mealResults.length === 0 && (
                <div className="py-1.5 text-caption text-ink-quaternary">
                  {mealCategory ? '该类型暂无结果，试试其他类型' : '请选择餐品类型'}
                </div>
              )}
              {!mealLoading && mealResults.map((place, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); handlePickMeal(place) }}
                  className="flex w-full items-start gap-1.5 rounded-md bg-white/60 px-2 py-1.5 text-left hover:bg-white transition-colors"
                >
                  <Utensils className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-caption font-medium text-ink-primary">{place.name}</div>
                    {place.address && (
                      <div className="truncate text-[10px] text-ink-quaternary">{place.address}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* rest 节点：最近公共厕所标记 */}
          {showToilet && !isEditing && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-mintOk-muted/30 p-2">
              <div className="text-caption font-medium text-mintOk">附近公共厕所</div>
              {toiletLoading && (
                <div className="flex items-center gap-1.5 py-2 text-caption text-ink-tertiary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  搜索中...
                </div>
              )}
              {!toiletLoading && toiletResults.length === 0 && (
                <div className="py-1.5 text-caption text-ink-quaternary">暂无结果</div>
              )}
              {!toiletLoading && toiletResults.map((place, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); handlePickToilet(place) }}
                  className="flex w-full items-start gap-1.5 rounded-md bg-white/60 px-2 py-1.5 text-left hover:bg-white transition-colors"
                >
                  <Toilet className="mt-0.5 h-3 w-3 shrink-0 text-mintOk" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-caption font-medium text-ink-primary">{place.name}</div>
                    <div className="truncate text-[10px] text-ink-quaternary">
                      {place.distance != null ? `约 ${place.distance}m` : place.address}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* rest 节点：已标记的公共厕所（持久化显示） */}
          {node.node_type === 'rest' && !isEditing && !showToilet && (() => {
            const nodeMeta = node.metadata as Record<string, unknown> | null
            const toilet = nodeMeta?.nearest_toilet as { name?: string; address?: string } | undefined
            if (!toilet?.name) return null
            return (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-mintOk-muted/40 px-2.5 py-1.5 text-caption text-mintOk">
                <Toilet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">最近厕所：{toilet.name}</div>
                  {toilet.address && (
                    <div className="truncate text-[10px] text-mintOk/70">{toilet.address}</div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* rest 节点：AI 推荐休息点 */}
          {showRestSpots && !isEditing && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-azure-muted/30 p-2">
              <div className="flex items-center gap-1.5 text-caption font-medium text-azure">
                <Coffee className="h-3.5 w-3.5" />
                附近休息点推荐
              </div>
              {restLoading && (
                <div className="flex items-center gap-1.5 py-2 text-caption text-ink-tertiary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI 推荐中...
                </div>
              )}
              {!restLoading && restSpots.length === 0 && (
                <div className="py-1.5 text-caption text-ink-quaternary">暂无结果</div>
              )}
              {!restLoading && restSpots.map((spot, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); handlePickRestSpot(spot) }}
                  className="flex w-full items-start gap-1.5 rounded-md bg-white/60 px-2 py-1.5 text-left hover:bg-white transition-colors"
                >
                  <Coffee className="mt-0.5 h-3 w-3 shrink-0 text-azure" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-caption font-medium text-ink-primary">{spot.name}</div>
                      {spot.type && (
                        <span className="shrink-0 rounded-full bg-azure-muted/60 px-1.5 py-0.5 text-[10px] text-azure">
                          {spot.type}
                        </span>
                      )}
                    </div>
                    {spot.reason && (
                      <div className="truncate text-[10px] text-ink-tertiary">{spot.reason}</div>
                    )}
                    {spot.distance != null && (
                      <div className="text-[10px] text-ink-quaternary">约 {spot.distance}m</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* rest 节点：已设置的休息点（持久化显示） */}
          {node.node_type === 'rest' && !isEditing && !showRestSpots && (() => {
            const nodeMeta = node.metadata as Record<string, unknown> | null
            const restSpot = nodeMeta?.rest_spot as { name?: string; type?: string; reason?: string } | undefined
            if (!restSpot?.name) return null
            return (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-azure-muted/40 px-2.5 py-1.5 text-caption text-azure">
                <Coffee className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">
                    休息点：{restSpot.name}
                    {restSpot.type && <span className="ml-1 text-azure/70">· {restSpot.type}</span>}
                  </div>
                  {restSpot.reason && (
                    <div className="truncate text-[10px] text-azure/70">{restSpot.reason}</div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* 操作区 */}
        <div className={cn(
          'flex shrink-0 items-center gap-1 transition-opacity',
          isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          {!isEditing && onAddNode && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddNode() }}
              className="rounded-md p-1.5 text-ink-quaternary hover:bg-surface-muted hover:text-ink-secondary"
              title="在此后添加节点"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {!isEditing && (node.node_type === 'meal' || /餐|午餐|晚餐|早餐|美食|饭店/.test(node.name)) && destination && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSearchMeal() }}
              disabled={mealLoading}
              className="rounded-md p-1.5 text-ink-quaternary hover:bg-gold-muted hover:text-gold"
              title="搜索附近餐厅"
            >
              {mealLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Utensils className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {!isEditing && node.node_type === 'rest' && destination && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSearchToilet() }}
              disabled={toiletLoading}
              className="rounded-md p-1.5 text-ink-quaternary hover:bg-mintOk-muted hover:text-mintOk"
              title="搜索最近公共厕所"
            >
              {toiletLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Toilet className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {!isEditing && node.node_type === 'rest' && destination && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSearchRestSpots() }}
              disabled={restLoading}
              className="rounded-md p-1.5 text-ink-quaternary hover:bg-azure-muted hover:text-azure"
              title="AI 推荐附近休息点"
            >
              {restLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Coffee className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="rounded-md p-1.5 text-ink-quaternary hover:bg-[var(--danger)]/10 hover:text-danger"
              title="删除节点"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {isEditing && (
            <div className="ml-1 flex h-6 w-6 items-center justify-center rounded text-gray-300">
              ⠿
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
