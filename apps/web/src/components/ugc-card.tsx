'use client'

import { motion } from 'framer-motion'
import { ThumbsUp, MessageCircle, MapPin, Star } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { UgcFeedItem } from '@/types/api'

function confidenceBadge(
  status: string,
  confidence: number | null,
): {
  label: string
  bg: string
  text: string
} {
  if (status === 'verified' || (confidence ?? 0) >= 0.7)
    return {
      label: '已验证',
      bg: 'bg-mintOk-muted',
      text: 'text-mintOk',
    }
  if ((confidence ?? 0) >= 0.3)
    return {
      label: '待审核',
      bg: 'bg-amberCaution-muted',
      text: 'text-amberCaution',
    }
  return {
    label: '低可信',
    bg: 'bg-gray-100/80',
    text: 'text-gray-500',
  }
}

interface UgcCardProps {
  item: UgcFeedItem
  onUpvote?: (id: string) => void
  onComment?: (id: string) => void
  upvotePending?: boolean
}

export function UgcCard({
  item,
  onUpvote,
  onComment,
  upvotePending = false,
}: UgcCardProps) {
  const cb = confidenceBadge(item.status, item.confidence)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="break-inside-avoid mb-4 overflow-hidden rounded-2xl glass transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-glass-lg"
    >
      {/* 图片占满顶部 */}
      {item.photos?.[0] && (
        <div className="relative h-52 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.photos[0]}
            alt={item.spot?.name ?? ''}
            className="h-full w-full object-cover"
          />
          {/* 状态徽章浮在图片右上 */}
          <div className="absolute right-3 top-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${cb.bg} ${cb.text}`}
            >
              {cb.label}
            </span>
          </div>
        </div>
      )}

      {/* 内容区：底部玻璃信息浮层 */}
      <div className="p-5">
        {/* 地点行 */}
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-900">
          <MapPin className="h-3.5 w-3.5 text-azure" />
          {item.spot?.name ?? '未知地点'}
        </div>

        {/* 内容文本 */}
        <p className="mb-3 line-clamp-3 text-sm text-gray-600">{item.content}</p>

        {/* 评分 */}
        {item.rating && (
          <div className="mb-3 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < item.rating! ? 'fill-amberCaution text-amberCaution' : 'text-gray-200'}`}
              />
            ))}
          </div>
        )}

        {/* 底部操作行 */}
        <div className="flex items-center justify-between border-t border-gray-200/50 pt-3">
          {/* 左：作者头像 + 名字 + 时间 */}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={item.author_avatar ?? undefined} />
              <AvatarFallback className="bg-gray-100 text-xs text-gray-500">
                {item.author_name?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-900">
                {item.author_name ?? '匿名用户'}
              </span>
              <span className="text-[10px] text-gray-400">
                {timeAgo(item.created_at)}
              </span>
            </div>
          </div>

          {/* 右：点赞 + 评论 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpvote?.(item.id)}
              disabled={upvotePending}
              className="group flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-azure-muted hover:text-azure disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ThumbsUp className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
              {item.upvotes}
            </button>
            <button
              type="button"
              onClick={() => onComment?.(item.id)}
              className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {item.comment_count}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
