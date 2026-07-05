'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Wand2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useGenerateTrip } from '@/lib/hooks/use-trips'
import { useTripStore } from '@/lib/stores/trip-store'
import { useToast, toast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { GenerateTripResponse } from '@/types/api'

const PREFERENCES = [
  '亲子游',
  '自然风光',
  '美食',
  '文化历史',
  '户外探险',
  '休闲度假',
  '摄影',
  '购物',
]

const schema = z
  .object({
    destination: z.string().min(1, '请填写目的地'),
    departure: z.string().optional(),
    startDate: z.string().min(1, '请选择出发日期'),
    endDate: z.string().min(1, '请选择结束日期'),
    pace: z.enum(['tight', 'relaxed']),
    travelerCount: z.coerce.number().int().min(1).max(20),
    preferences: z.array(z.string()),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: '结束日期不能早于出发日期',
    path: ['endDate'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onGenerated?: (res: GenerateTripResponse) => void
}

export function GenerateTripDialog({ open, onOpenChange, onGenerated }: Props) {
  const generate = useGenerateTrip()
  const setDraft = useTripStore((s) => s.setDraft)
  const setGenerating = useTripStore((s) => s.setGenerating)
  const toast = useToast().toast

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      destination: '',
      departure: '',
      startDate: '',
      endDate: '',
      pace: 'relaxed',
      travelerCount: 1,
      preferences: [],
    },
  })

  const pace = watch('pace')
  const selectedPrefs = watch('preferences')

  const togglePref = (p: string) => {
    const cur = selectedPrefs ?? []
    setValue(
      'preferences',
      cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
      { shouldValidate: true }
    )
  }

  const onSubmit = async (values: FormValues) => {
    setGenerating(true)
    setDraft({
      destination: values.destination,
      departure: values.departure ?? '',
      startDate: values.startDate,
      endDate: values.endDate,
      pace: values.pace,
      travelerCount: values.travelerCount,
      preferences: values.preferences,
    })
    try {
      const res = await generate.mutateAsync({
        destination: values.destination,
        departure: values.departure,
        start_date: values.startDate,
        end_date: values.endDate,
        pace: values.pace,
        traveler_count: values.travelerCount,
        preferences: values.preferences,
      })
      toast({ title: '行程已生成', description: `共 ${res.nodes.length} 个节点` })
      onGenerated?.(res)
      onOpenChange(false)
      reset()
    } catch (e) {
      toast({
        title: '生成失败',
        description: e instanceof Error ? e.message : '请重试',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-accent" />
            AI 生成行程
          </DialogTitle>
          <DialogDescription>
            填写旅行信息，AI 将为你智能排程
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="destination">目的地 *</Label>
            <Input
              id="destination"
              placeholder="如：杭州"
              {...register('destination')}
            />
            {errors.destination && (
              <p className="text-caption text-danger">
                {errors.destination.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="departure">出发地</Label>
            <Input
              id="departure"
              placeholder="如：上海"
              {...register('departure')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">出发日期 *</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-caption text-danger">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">结束日期 *</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-caption text-danger">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>行程节奏</Label>
              <Select
                value={pace}
                onValueChange={(v) =>
                  setValue('pace', v as 'tight' | 'relaxed')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relaxed">松弛版（每日 ≤3 景点）</SelectItem>
                  <SelectItem value="tight">紧凑版（最大化覆盖）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="travelerCount">出行人数</Label>
              <Input
                id="travelerCount"
                type="number"
                min={1}
                max={20}
                {...register('travelerCount')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>偏好（可多选）</Label>
            <div className="flex flex-wrap gap-2">
              {PREFERENCES.map((p) => {
                const active = selectedPrefs?.includes(p)
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => togglePref(p)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-caption transition-colors',
                      active
                        ? 'border-accent bg-accent-muted text-accent'
                        : 'border-border text-ink-tertiary hover:border-border'
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={generate.isPending}>
              {generate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  AI 生成行程
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
