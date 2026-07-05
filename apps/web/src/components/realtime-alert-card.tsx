'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CloudRain,
  TrafficCone,
  Users,
  Wrench,
  Utensils,
  Check,
  MapPin,
  Sparkles,
  Star,
  ChevronRight,
} from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'
import { GlassCard, GlassTip } from '@/components/glass'
import type { RealtimeAlert } from '@/types/database'
import type { AlertPriority, AlertType } from '@trip-ai/shared'

// ===== 样式配置 =====

const PRIORITY_CONFIG: Record<
  AlertPriority,
  { border: string; glow: string; iconBg: string; iconColor: string; badge: string; badgeText: string }
> = {
  high: {
    border: 'border-l-[3px] border-l-[var(--danger)]',
    glow: 'shadow-red-50',
    iconBg: 'bg-[var(--danger)]/10',
    iconColor: 'text-[var(--danger)]',
    badge: 'bg-[var(--danger)]/10 text-[var(--danger)]',
    badgeText: '紧急',
  },
  medium: {
    border: 'border-l-[3px] border-l-[var(--warning)]',
    glow: 'shadow-amber-50',
    iconBg: 'bg-[var(--warning)]/10',
    iconColor: 'text-[var(--warning)]',
    badge: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    badgeText: '注意',
  },
  low: {
    border: 'border-l-[3px] border-l-[var(--info)]',
    glow: 'shadow-blue-50',
    iconBg: 'bg-[var(--info)]/10',
    iconColor: 'text-[var(--info)]',
    badge: 'bg-[var(--info)]/10 text-[var(--info)]',
    badgeText: '提示',
  },
}

const TYPE_ICON: Record<string, typeof AlertTriangle> = {
  traffic: TrafficCone,
  weather: CloudRain,
  crowd: Users,
  facility: Wrench,
  queue: Users,
  dining: Utensils,
}

interface AlertMetadata {
  alternatives?: { name: string; rating?: string; address?: string }[]
  search_query?: string
}

interface RealtimeAlertCardProps {
  alert: RealtimeAlert
  destination?: string
  onAccept?: (id: string) => void
  onDismiss?: (id: string, reason?: string) => void
  /** 用户点击备选方案的"替换"按钮时触发，返回备选方案 + 起点元素 ref */
  onPickAlternative?: (
    alertId: string,
    alternative: { name: string; rating?: string; address?: string },
    fromEl: HTMLElement,
  ) => void
  /** 当前是否处于替换选择模式（用于禁用按钮） */
  replacingActive?: boolean
}

export const RealtimeAlertCard = React.forwardRef(function RealtimeAlertCard(
  {
    alert,
    destination,
    onAccept,
    onDismiss,
    onPickAlternative,
    replacingActive,
  }: RealtimeAlertCardProps,
  _ref: React.Ref<HTMLDivElement>,
) {
  const [dismissed, setDismissed] = React.useState(false)
  const [pickedAltIdx, setPickedAltIdx] = React.useState<number | null>(null)

  const priority = (alert.priority as AlertPriority) ?? 'medium'
  const type = (alert.alert_type as string) ?? 'facility'
  const config = PRIORITY_CONFIG[priority]
  const Icon = TYPE_ICON[type] ?? AlertTriangle
  const isResolved = alert.status !== 'pending'

  const description = alert.description ?? ''
  const title = alert.title ?? ''
  const suggestion = alert.suggestion ?? ''
  const meta = (alert as any).metadata as AlertMetadata | null
  const alternatives = meta?.alternatives ?? []

  const handleDismiss = (reason?: string) => {
    setDismissed(true)
    onDismiss?.(alert.id, reason)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('rounded-xl border-l-[3px] py-1', config.border)}
    >
        <div className="px-3">
          {/* 标题行 */}
          <div className="mb-3 flex items-start gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', config.iconBg)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-appleDisplay text-sm font-semibold text-gray-700 dark:text-gray-900">
                  {title}
                </h4>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', config.badge)}>
                  {config.badgeText}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {destination ? `${destination} · ` : ''}
                {timeAgo(alert.created_at)}
              </p>
            </div>
          </div>

          {/* 问题描述 */}
          {description && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-600">{description}</p>
          )}

          {/* AI 建议改为 GlassTip（折叠态） */}
          {suggestion && (
            <GlassTip
              icon={<Sparkles className="h-4 w-4" />}
              tone={isResolved ? 'default' : 'azure'}
              label={isResolved ? `AI 建议 · 已${alert.status === 'accepted' ? '采纳' : '忽略'}` : 'AI 建议：点此查看'}
              detail={
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{suggestion}</p>
                </div>
              }
              className="mb-2"
            />
          )}

          {/* 备选方案改为 GlassTip 列表（任何状态都可见，已处理时降级为只读展示） */}
          {alternatives.length > 0 && (
            <div className="mb-3 space-y-2">
              <GlassTip
                icon={<MapPin className="h-4 w-4" />}
                tone={isResolved ? 'default' : 'amber'}
                label={`备选方案 · ${alternatives.length} 个${isResolved ? '（仅供参考）' : replacingActive ? ' · 请在时间轴选择替换目标' : ''}`}
                defaultOpen={!isResolved}
                detail={
                  <ul className="space-y-2">
                    {alternatives.map((alt, i) => {
                      const isPicked = pickedAltIdx === i
                      return (
                        <li
                          key={i}
                          className={cn(
                            'flex items-center gap-2 rounded-lg bg-gray-100/60 px-3 py-2 transition-all',
                            isPicked && 'ring-2 ring-accent bg-accent-muted/30',
                          )}
                        >
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700">{alt.name}</div>
                            {alt.address && <div className="text-xs text-gray-400">{alt.address}</div>}
                          </div>
                          {alt.rating && alt.rating !== '0' && (
                            <span className="flex items-center gap-0.5 text-xs text-amberCaution">
                              <Star className="h-3 w-3 fill-current" />
                              {alt.rating}
                            </span>
                          )}
                          {!isResolved && onPickAlternative && (
                            <button
                              type="button"
                              disabled={replacingActive && !isPicked}
                              data-alt-idx={i}
                              data-alert-id={alert.id}
                              onClick={(e) => {
                                if (isPicked) {
                                  // 取消选择
                                  setPickedAltIdx(null)
                                  return
                                }
                                setPickedAltIdx(i)
                                onPickAlternative(alert.id, alt, e.currentTarget)
                              }}
                              className={cn(
                                'ml-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all',
                                isPicked
                                  ? 'bg-accent text-white'
                                  : 'bg-accent-muted/40 text-accent hover:bg-accent hover:text-white',
                                replacingActive && !isPicked && 'opacity-40 cursor-not-allowed',
                              )}
                            >
                              {isPicked ? '已选中' : '替换'}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                }
              />
              {replacingActive && pickedAltIdx !== null && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md bg-accent-muted/30 px-3 py-2 text-xs text-accent"
                >
                  已选中备选方案，请在左侧时间轴点击要替换的景点节点
                </motion.div>
              )}
            </div>
          )}

          {/* 操作按钮：Apple pill 风格 */}
          {!isResolved && !dismissed && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAccept?.(alert.id)}
                className="apple-pill apple-pill-primary flex-1 justify-center"
              >
                <Check className="h-4 w-4" />
                采纳建议
              </button>
              <button
                type="button"
                onClick={() => handleDismiss('user_dismiss')}
                className="apple-pill apple-pill-glass"
              >
                继续原计划
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* 已解决状态 */}
          {isResolved && !dismissed && (
            <div className="mt-3 flex items-center gap-1.5">
              {alert.status === 'accepted' ? (
                <>
                  <Check className="h-3.5 w-3.5 text-azure" />
                  <span className="text-xs font-medium text-azure">已采纳 · 行程已更新</span>
                </>
              ) : (
                <span className="text-xs text-gray-400">已忽略</span>
              )}
            </div>
          )}

          {/* care_tip 已移至时间轴对应节点，不再在预警卡片中显示 */}
        </div>
    </motion.div>
  )
})
