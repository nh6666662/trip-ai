'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Megaphone, Star, Camera, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { UgcCard } from '@/components/ugc-card'
import {
  useUgcFeed,
  useCreateUgc,
  useVoteUgc,
  useSpots,
  useSession,
  toast,
} from '@/lib/hooks'
import { useSessionStore } from '@/lib/stores'
import { useTripStore } from '@/lib/stores/trip-store'
import { PlaceSearchInput, type PlaceResult } from '@/components/place-search-input'
import { cn } from '@/lib/utils/cn'
import type { UgcFeedItem } from '@/types/api'
import type { UGCReportInsert } from '@/types/database'

type Filter = 'all' | 'crowd' | 'queue' | 'facility'

export default function CommunityPage() {
  const t = useTranslations('community')
  const tc = useTranslations('common')

  const [filter, setFilter] = React.useState<Filter>('all')
  const searchParams = useSearchParams()
  const locationFilter = searchParams.get('location')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [rating, setRating] = React.useState(0)
  const [spotId, setSpotId] = React.useState('')
  const [place, setPlace] = React.useState<PlaceResult | null>(null)
  const [content, setContent] = React.useState('')

  // 同步 Supabase Auth 会话到 store（防刷新后 user 为 null）
  useSession()
  const user = useSessionStore((s) => s.user)
  const currentTrip = useTripStore((s) => s.currentTrip)
  const { data: spots } = useSpots()
  const feed = useUgcFeed(filter)
  const createUgc = useCreateUgc()
  const voteUgc = useVoteUgc()

  const allItems = feed.data ?? []
  const items = React.useMemo(() => {
    if (!locationFilter) return allItems
    return allItems.filter((it) => {
      const text = (it.content || '') + (it.spot?.name || '')
      return text.includes(locationFilter)
    })
  }, [allItems, locationFilter])
  const hasSpots = (spots?.length ?? 0) > 0

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'crowd', label: t('filterCrowd') },
    { value: 'queue', label: t('filterQueue') },
    { value: 'facility', label: t('filterFacility') },
  ]

  const handleUpvote = React.useCallback(
    (id: string) => {
      voteUgc.mutate(id)
      toast({ title: t('upvote') })
    },
    [voteUgc, t],
  )

  const handleComment = (_id: string) => {
    toast({ title: '评论功能开发中' })
  }

  const resetForm = () => {
    setRating(0)
    setSpotId('')
    setPlace(null)
    setContent('')
  }

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) resetForm()
  }

  const handleSubmit = async () => {
    if (!spotId && !place) {
      toast({ title: '请选择或输入地点', variant: 'warning' })
      return
    }
    if (!content.trim()) {
      toast({ title: '请填写内容', variant: 'warning' })
      return
    }
    const payload: UGCReportInsert & {
      place_name?: string
      place_lat?: number
      place_lng?: number
    } = {
      user_id: user?.id ?? '',
      spot_id: spotId || '',
      trip_id: currentTrip?.id ?? null,
      content: content.trim(),
      rating: rating > 0 ? rating : null,
      photos: null,
    }
    // 如果用户通过搜索/定位选择了新地点（无 spot_id），传 place_name + 坐标
    if (!spotId && place) {
      payload.spot_id = ''
      payload.place_name = place.name
      if (place.location) {
        payload.place_lat = place.location.lat
        payload.place_lng = place.location.lng
      }
    }
    try {
      await createUgc.mutateAsync(payload)
      toast({ title: '上报成功', variant: 'success' })
      handleOpenChange(false)
    } catch {
      toast({ title: '上报失败，请重试', variant: 'destructive' })
    }
  }

  return (
    <div className="mx-auto w-full max-w-[960px] p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-h2">{t('title')}</h1>
          <p className="mt-2 text-body text-ink-tertiary">{t('subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="accent" className="shrink-0">
              <Megaphone className="h-4 w-4" />
              {t('reportNow')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('shareStory')}</DialogTitle>
              <DialogDescription>{t('subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>地点</Label>
                  {hasSpots && (
                    <button
                      type="button"
                      onClick={() => {
                        setSpotId('')
                        setPlace(null)
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      {spotId ? '切换为搜索/定位' : '从已收藏景点选择'}
                    </button>
                  )}
                </div>
                {/* 模式切换：已收藏景点下拉 / 搜索+定位 */}
                {spotId && hasSpots ? (
                  <Select value={spotId} onValueChange={setSpotId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择已收藏景点" />
                    </SelectTrigger>
                    <SelectContent>
                      {spots!.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <PlaceSearchInput
                      value={place?.name ?? ''}
                      onPlaceSelect={(p) => {
                        setPlace(p)
                        setSpotId('')
                      }}
                      placeholder="搜索地点名称，或点击右侧定位按钮"
                    />
                    {place && (
                      <div className="flex items-center gap-1.5 rounded-md bg-accent-muted/30 px-2.5 py-1.5 text-xs text-ink-secondary">
                        <MapPin className="h-3 w-3 text-accent" />
                        <span className="truncate">
                          已选：{place.name}
                          {place.address ? ` · ${place.address}` : ''}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>体验</Label>
                <Textarea
                  placeholder="分享你的旅行体验..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>评分</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} 星`}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          'h-6 w-6 transition-colors',
                          n <= rating
                            ? 'fill-gold text-gold'
                            : 'text-ink-quaternary hover:text-gold',
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>照片</Label>
                <Button type="button" variant="outline" size="sm">
                  <Camera className="h-4 w-4" />
                  添加照片
                </Button>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tc('cancel')}
                </Button>
              </DialogClose>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createUgc.isPending}
              >
                {createUgc.isPending ? tc('loading') : tc('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {locationFilter && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-accent-muted px-4 py-2.5">
          <div className="flex items-center gap-2 text-body-sm text-accent">
            <MapPin className="h-4 w-4" />
            <span>正在查看与「{locationFilter}」相关的动态</span>
          </div>
          <Link
            href="/community"
            className="text-caption text-ink-quaternary transition-colors hover:text-accent"
          >
            清除筛选 ×
          </Link>
        </div>
      )}

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
        className="mt-6 glass-subtle rounded-2xl p-1"
      >
        <TabsList>
          {filters.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* UGC 快速测试面板 */}
      <div className="mt-4 glass-subtle rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-lg">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-muted px-2.5 py-0.5 text-[11px] font-semibold text-gold">
            🧪 测试面板
          </span>
          <span className="text-caption text-gold">
            点击按钮模拟不同类型的 UGC 上报，测试系统 AI 响应
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickTestButton
            label="👥 人流密集"
            description="景点人多拥挤"
            spots={spots}
            createUgc={createUgc}
            userId={user?.id}
            tripId={currentTrip?.id}
            payload={{
              content: '这里人太多了，排队至少1小时才能进去，建议错峰来或者换个时间段。现场非常拥挤，拍照都要等很久。',
              rating: 2,
            }}
          />
          <QuickTestButton
            label="🚶 排队长"
            description="排队等候时间过长"
            spots={spots}
            createUgc={createUgc}
            userId={user?.id}
            tripId={currentTrip?.id}
            payload={{
              content: '排队排了将近2个小时才进去，队伍从门口一直排到停车场。建议大家提前网上预约或者早上8点之前来。',
              rating: 2,
            }}
          />
          <QuickTestButton
            label="🔧 设施故障"
            description="景点设施异常"
            spots={spots}
            createUgc={createUgc}
            userId={user?.id}
            tripId={currentTrip?.id}
            payload={{
              content: '景区的缆车今天停运维修了，告示牌说预计下午3点恢复。另外洗手间也在装修，只能用游客中心那边的。建议今天改去其他景点。',
              rating: 1,
            }}
          />
          <QuickTestButton
            label="🍜 美食踩雷"
            description="餐厅体验差"
            spots={spots}
            createUgc={createUgc}
            userId={user?.id}
            tripId={currentTrip?.id}
            payload={{
              content: '这家网红餐厅真的踩雷了，菜又贵又不好吃，服务员态度也很差。等了40分钟才上菜，而且分量很少。不推荐大家来。',
              rating: 1,
            }}
          />
          <QuickTestButton
            label="⭐ 强烈推荐"
            description="超棒的旅行体验"
            spots={spots}
            createUgc={createUgc}
            userId={user?.id}
            tripId={currentTrip?.id}
            payload={{
              content: '这里真的太美了！早上7点到的，人很少，拍照特别好看。工作人员也很热情，还帮我们拍了合照。强烈推荐大家来，记得带防晒！',
              rating: 5,
            }}
          />
          <QuickTestButton
            label="🌧️ 天气影响"
            description="天气导致行程变更"
            spots={spots}
            createUgc={createUgc}
            userId={user?.id}
            tripId={currentTrip?.id}
            payload={{
              content: '突然下暴雨了，户外的项目全部关闭。景区建议我们去附近的博物馆避雨，那边有室内展览可以看。估计雨要下到下午4点左右。',
              rating: 3,
            }}
          />
        </div>
      </div>

      {/* Feed */}
      <div className="mt-6">
        {feed.isLoading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-4">
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <p className="text-body text-ink-quaternary">{tc('empty')}</p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {items.map((item) => (
              <UgcCard
                key={item.id}
                item={item}
                onUpvote={handleUpvote}
                onComment={handleComment}
                upvotePending={voteUgc.isPending && voteUgc.variables === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 快速测试按钮组件 =====

interface QuickTestButtonProps {
  label: string
  description: string
  spots: ReturnType<typeof useSpots>['data']
  createUgc: ReturnType<typeof useCreateUgc>
  userId?: string
  tripId?: string | null
  payload: { content: string; rating: number }
}

function QuickTestButton({
  label,
  description,
  spots,
  createUgc,
  userId,
  tripId,
  payload,
}: QuickTestButtonProps) {
  const [loading, setLoading] = React.useState(false)

  const handleClick = async () => {
    const availableSpots = spots ?? []
    if (availableSpots.length === 0) {
      toast({ title: '数据库中没有景点，请先生成行程或添加景点', variant: 'warning' })
      return
    }

    if (!userId) {
      toast({ title: '请先登录后再测试', variant: 'warning' })
      return
    }

    const spot = availableSpots[Math.floor(Math.random() * availableSpots.length)]
    setLoading(true)

    try {
      await createUgc.mutateAsync({
        user_id: userId,
        spot_id: spot.id,
        trip_id: tripId ?? null,
        content: payload.content,
        rating: payload.rating,
        photos: null,
      })
      toast({ title: `✅ ${label} 上报成功 — 景点：${spot.name}${tripId ? ' · 已关联行程' : ''}`, variant: 'success' })
    } catch {
      toast({ title: '上报失败，请重试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-left transition-all duration-300',
        'hover:border-gold hover:shadow-sm hover:-translate-y-0.5 hover:shadow-glass-lg',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        loading && 'animate-pulse'
      )}
    >
      <div className="min-w-0">
        <div className="text-body-sm font-medium text-ink-primary">{label}</div>
        <div className="text-[11px] text-ink-quaternary">{description}</div>
      </div>
    </button>
  )
}
