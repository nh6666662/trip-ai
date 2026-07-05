'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Award,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  LogOut,
  MapPin,
  Plus,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react'

import { useSession, useTrips, toast } from '@/lib/hooks'
import { useSessionStore } from '@/lib/stores'
import { createBrowserClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import type { TripListItem } from '@/types/api'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassSectionTitle,
  GlassStat,
} from '@/components/glass'

/** 旅行偏好预设标签 */
const PRESET_PREFERENCES = [
  '亲子游',
  '自然风光',
  '美食',
  '文化历史',
  '户外探险',
  '休闲度假',
  '摄影',
  '购物',
] as const

/** 缓动曲线 token */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** 行程状态 → 标签 + 徽章样式 */
function statusMeta(
  status: string,
  t: (key: string) => string,
): { label: string; variant: 'default' | 'success' | 'outline' } {
  switch (status) {
    case 'confirmed':
      return { label: t('trip.statusConfirmed'), variant: 'default' }
    case 'completed':
      return { label: t('trip.statusCompleted'), variant: 'success' }
    default:
      return { label: t('trip.statusDraft'), variant: 'outline' }
  }
}

export default function ProfilePage() {
  // 触发 Supabase Auth → session store 同步
  useSession()
  const t = useTranslations()

  const { user, isLoading, fallbackEmail, updateProfile, signOut } =
    useSessionStore()
  const { data: trips, isLoading: tripsLoading } = useTrips()

  // 对话框状态
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [prefs, setPrefs] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // 行程 Tab：按 status 分组
  const [activeTab, setActiveTab] = useState<'draft' | 'confirmed' | 'completed'>('confirmed')

  /** 加载态骨架屏 */
  if (isLoading) {
    return (
      <div className="apple-bg min-h-full">
        <div className="mx-auto max-w-[1100px] space-y-6 p-6">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  /** 未登录 */
  if (!user) {
    return (
      <div className="apple-bg flex min-h-full items-center justify-center p-6">
        <GlassCard variant="strong" padding="default" className="max-w-md text-center">
          <UserCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h2 className="font-appleDisplay text-xl font-semibold text-gray-700 dark:text-gray-900">
            {t('profile.notLoggedIn')}
          </h2>
          <p className="mt-2 text-sm text-gray-500">{t('profile.subtitle')}</p>
          <Link href="/login" className="apple-pill apple-pill-primary mt-6">
            {t('profile.login')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </GlassCard>
      </div>
    )
  }

  // 行程按 status 分组
  const tripsByStatus = {
    draft: trips?.filter((trip) => trip.status === 'draft') ?? [],
    confirmed: trips?.filter((trip) => trip.status === 'confirmed') ?? [],
    completed: trips?.filter((trip) => trip.status === 'completed') ?? [],
  }

  // 信誉分等级
  const reputation = Math.round((user.reputation_score ?? 0) * 100)
  const reputationLevel =
    reputation >= 80 ? '资深旅人' : reputation >= 50 ? '探索者' : '新手旅人'
  const reputationColor =
    reputation >= 80
      ? 'text-mintOk'
      : reputation >= 50
        ? 'text-azure'
        : 'text-amberCaution'

  /** 打开头像对话框 */
  const openAvatar = () => {
    setAvatarUrl(user.avatar_url ?? '')
    setAvatarOpen(true)
  }

  /** 打开信息对话框 */
  const openEdit = () => {
    setDisplayName(user.display_name ?? '')
    setPrefs(user.travel_preferences ?? [])
    setEditOpen(true)
  }

  /** 保存头像 */
  const saveAvatar = async () => {
    if (!user) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl || null })
        .eq('id', user.id)
      if (error) throw error
      updateProfile({ avatar_url: avatarUrl || null })
      toast({ title: t('profile.saved') })
      setAvatarOpen(false)
    } catch {
      toast({ title: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  /** 保存信息 */
  const saveInfo = async () => {
    if (!user) return
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: displayName || null,
          travel_preferences: prefs,
        })
        .eq('id', user.id)
      if (error) throw error
      updateProfile({
        display_name: displayName || null,
        travel_preferences: prefs,
      })
      toast({ title: t('profile.saved') })
      setEditOpen(false)
    } catch {
      toast({ title: t('common.error') })
    } finally {
      setSaving(false)
    }
  }

  /** 切换偏好选中 */
  const togglePref = (p: string) =>
    setPrefs((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )

  /** 退出登录 */
  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
    } catch {
      // 忽略，继续清理本地状态
    }
    signOut()
  }

  return (
    <div className="apple-bg min-h-full">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        {/* —— Hero Banner: 模糊头像背景 + 玻璃浮层 —— */}
        <GlassCard
          variant="strong"
          padding="none"
          className="mb-6 overflow-hidden"
        >
          {/* 模糊背景层 */}
          {user.avatar_url && (
            <div
              className="absolute inset-0 -z-10 scale-110 bg-cover bg-center opacity-30 blur-3xl"
              style={{ backgroundImage: `url(${user.avatar_url})` }}
              aria-hidden
            />
          )}
          <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center">
            {/* 头像 */}
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white/60 dark:border-gray-700/60">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-azure/10 font-appleDisplay text-3xl font-semibold text-azure">
                  {user.display_name?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={openAvatar}
                className="glass-strong absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:text-azure"
                aria-label={t('profile.editAvatar')}
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* 名字 + 邮箱 + 信誉分等级 */}
            <div className="flex-1">
              <h1 className="font-appleDisplay text-3xl font-semibold tracking-tight text-gray-700 dark:text-gray-900">
                {user.display_name ?? fallbackEmail}
              </h1>
              {fallbackEmail && user.display_name && (
                <p className="mt-1 text-sm text-gray-400">{fallbackEmail}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`apple-pill apple-pill-glass !px-3 !py-1 text-xs font-semibold ${reputationColor}`}
                >
                  <Award className="h-3.5 w-3.5" />
                  {reputationLevel}
                </span>
                <span className="text-xs text-gray-400">
                  信誉分 {reputation}/100
                </span>
              </div>
            </div>

            {/* 编辑按钮 */}
            <button
              type="button"
              onClick={openEdit}
              className="apple-pill apple-pill-glass self-start"
            >
              <Settings className="h-4 w-4" />
              {t('common.edit')}
            </button>
          </div>
        </GlassCard>

        {/* —— Stats 网格 —— */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <GlassCard padding="default" hover>
            <GlassStat
              icon={<Award className="h-5 w-5" />}
              value={reputation}
              label="信誉分"
            />
          </GlassCard>
          <GlassCard padding="default" hover>
            <GlassStat
              icon={<MapPin className="h-5 w-5" />}
              value={trips?.length ?? 0}
              label="行程总数"
            />
          </GlassCard>
          <GlassCard padding="default" hover>
            <GlassStat
              icon={<CheckCircle2 className="h-5 w-5" />}
              value={tripsByStatus.completed.length}
              label="已完成"
            />
          </GlassCard>
          <GlassCard padding="default" hover>
            <GlassStat
              icon={<Clock className="h-5 w-5" />}
              value={tripsByStatus.confirmed.length}
              label="进行中"
            />
          </GlassCard>
        </div>

        {/* —— 旅行偏好 chip 列表（主页面展示） —— */}
        <GlassSectionTitle className="mb-3">旅行偏好</GlassSectionTitle>
        <GlassCard padding="default" className="mb-6">
          {user.travel_preferences && user.travel_preferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.travel_preferences.map((pref) => (
                <span
                  key={pref}
                  className="apple-pill apple-pill-glass !px-3 !py-1.5 text-xs"
                >
                  {pref}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              尚未设置偏好，点击右上「编辑」添加你的旅行偏好
            </p>
          )}
        </GlassCard>

        {/* —— 我的行程 Tab（draft / confirmed / completed） —— */}
        <GlassSectionTitle
          className="mb-3"
          action={
            <div className="flex gap-1">
              {(['confirmed', 'draft', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`apple-pill !px-3 !py-1.5 text-xs ${
                    activeTab === tab
                      ? 'apple-pill-primary'
                      : 'apple-pill-glass'
                  }`}
                >
                  {tab === 'confirmed'
                    ? '进行中'
                    : tab === 'draft'
                      ? '草稿'
                      : '已完成'}
                  <span className="ml-1 opacity-70">
                    {tripsByStatus[tab].length}
                  </span>
                </button>
              ))}
            </div>
          }
        >
          我的行程
        </GlassSectionTitle>

        {tripsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : tripsByStatus[activeTab].length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {tripsByStatus[activeTab].map((trip) => (
              <TripCard key={trip.id} trip={trip} t={t} />
            ))}
          </div>
        ) : (
          <GlassCard variant="subtle" padding="default" className="text-center">
            <MapPin className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-400">{t('common.empty')}</p>
            <Link href="/trips" className="apple-pill apple-pill-primary mt-4">
              <Plus className="h-4 w-4" />
              创建第一个行程
            </Link>
          </GlassCard>
        )}

        {/* —— 退出登录 —— */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleLogout}
            className="apple-pill apple-pill-glass !text-coralWarn"
          >
            <LogOut className="h-4 w-4" />
            {t('profile.logout')}
          </button>
        </div>

        {/* —— 修改头像对话框（保留原逻辑） —— */}
        <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('profile.editAvatar')}</DialogTitle>
              <DialogDescription>
                {t('profile.editAvatar')} URL
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="avatar-url">URL</Label>
              <Input
                id="avatar-url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAvatarOpen(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={saveAvatar} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* —— 编辑信息对话框（保留原逻辑） —— */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('common.edit')}</DialogTitle>
              <DialogDescription>{t('profile.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">{t('profile.displayName')}</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('profile.displayName')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('profile.preferences')}</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PREFERENCES.map((p) => {
                    const selected = prefs.includes(p)
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePref(p)}
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1.5 text-body-sm transition-colors',
                          selected
                            ? 'border-accent bg-accent text-white'
                            : 'border-border bg-surface-elevated text-ink-secondary hover:bg-surface-muted',
                        )}
                      >
                        {selected ? (
                          <Check className="mr-1 h-3 w-3" />
                        ) : null}
                        {p}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={saveInfo} disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

/** 行程卡片 — Apple Glass 风格 */
function TripCard({
  trip,
  t,
}: {
  trip: TripListItem
  t: (key: string) => string
}) {
  const meta = statusMeta(trip.status, t)
  return (
    <GlassCard
      hover
      padding="default"
      className="cursor-pointer transition-all duration-300 hover:bg-glass-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">📍</span>
            <h3 className="font-appleDisplay text-base font-semibold text-gray-700 dark:text-gray-900">
              {trip.destination}
            </h3>
          </div>
          <p className="text-xs text-gray-400">
            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            meta.variant === 'success'
              ? 'bg-mintOk-muted text-mintOk'
              : meta.variant === 'outline'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-azure-muted text-azure'
          }`}
        >
          {meta.label}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {trip.traveler_count} 人
        </span>
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {trip.node_count ?? 0} 节点
        </span>
      </div>
    </GlassCard>
  )
}
