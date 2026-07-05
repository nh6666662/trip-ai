'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  Sparkles,
  RefreshCw,
  Check,
  User,
  Loader2,
  Settings2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Calendar,
  Cloud,
  Users,
  ExternalLink,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils/cn'
import { AiSettingsDialog } from '@/components/settings/ai-settings-dialog'
import { useAiSettingsStore } from '@/lib/stores/ai-settings-store'
import { useTripStore } from '@/lib/stores/trip-store'
import { BUILTIN_PROVIDERS, type ProviderRequest } from '@/lib/ai/providers'
import { toast } from '@/lib/hooks/use-toast'

/** 缓动曲线，与设计系统 transitionTimingFunction.out-expo 一致 */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  error?: boolean
}

/** 生成消息唯一 id（兼容无 crypto.randomUUID 的环境） */
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 判断助手回复是否需要渲染「行程方案卡片」
 *  匹配规则（满足任一即视为含可采纳方案）：
 *  1. 规则引擎降级模板关键字：行程方案卡片 / 采纳
 *  2. LLM 自然语言"加入行程"类表述：添加至…行程 / 加入…行程 / 添加到行程
 *  3. LLM 结构化方案：含 Day N / 第N天 + "方案"/"行程"字样
 */
function hasPlan(content: string): boolean {
  if (/行程方案卡片|采纳/.test(content)) return true
  if (/(添加|加入).{0,8}(行程|方案)/.test(content)) return true
  if (/(Day\s*\d|第\s*[一二三四五六七八九十\d]+\s*天).{0,40}(方案|行程|攻略)/.test(content)) return true
  return false
}

/** 中文城市识别白名单（国内 + 港澳台 + 日韩 + 东南亚 + 欧美） */
const ZH_CITIES = [
  // 国内
  '北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '西安',
  '南京', '武汉', '长沙', '厦门', '青岛', '大连', '三亚', '昆明',
  '丽江', '桂林', '拉萨', '苏州', '天津', '哈尔滨', '沈阳', '郑州',
  '福州', '济南', '贵阳', '兰州', '海口', '呼和浩特', '乌鲁木齐',
  '珠海', '无锡', '宁波', '秦皇岛', '洛阳', '张家界', '九寨沟',
  '黄山', '泰山', '华山', '峨眉山', '普陀山', '鼓浪屿', '西湖',
  '外滩', '故宫', '长城', '兵马俑', '莫高窟', '布达拉宫',
  '香格里拉', '西双版纳', '呼伦贝尔', '额济纳', '稻城亚丁',
  // 港澳台
  '台北', '香港', '澳门', '高雄', '台中',
  // 日韩
  '东京', '大阪', '京都', '名古屋', '札幌', '福冈', '冲绳',
  '首尔', '釜山', '济州岛',
  // 东南亚
  '曼谷', '清迈', '普吉岛', '新加坡', '吉隆坡', '槟城',
  '巴厘岛', '马尔代夫', '长滩岛', '芽庄', '岘港', '河内',
  // 欧美
  '巴黎', '伦敦', '纽约', '洛杉矶', '旧金山', '悉尼', '墨尔本',
  '罗马', '米兰', '威尼斯', '佛罗伦萨', '巴塞罗那', '马德里',
  '柏林', '慕尼黑', '阿姆斯特丹', '维也纳', '布拉格',
  '莫斯科', '圣彼得堡', '伊斯坦布尔', '雅典', '开罗',
  '多伦多', '温哥华', '夏威夷', '塞班', '关岛',
]

/** 英文城市名 → 中文映射（用于英文匹配后转中文，方便社区过滤） */
const EN_TO_ZH: Record<string, string> = {
  Beijing: '北京', Shanghai: '上海', Guangzhou: '广州', Shenzhen: '深圳',
  Chengdu: '成都', Hangzhou: '杭州', Chongqing: '重庆', "Xi'an": '西安',
  Tokyo: '东京', Osaka: '大阪', Kyoto: '京都', Seoul: '首尔',
  Bangkok: '曼谷', Singapore: '新加坡', Paris: '巴黎', London: '伦敦',
  'New York': '纽约', 'Los Angeles': '洛杉矶', Sydney: '悉尼',
  Rome: '罗马', Barcelona: '巴塞罗那', Taipei: '台北',
  'Hong Kong': '香港', Macau: '澳门', Bali: '巴厘岛',
}

/** 从文本中提取可能的城市/目的地名称（中文优先，回退英文） */
function extractLocation(text: string): string | null {
  for (const city of ZH_CITIES) {
    if (text.includes(city)) return city
  }
  // 匹配英文地名（首字母大写 2+ 字母，支持空格分隔多词）
  const enMatch = text.match(/\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)*)\b/)
  if (enMatch && EN_TO_ZH[enMatch[1]]) return EN_TO_ZH[enMatch[1]]
  if (enMatch) return enMatch[1]
  return null
}

/** 提取 AI 回复中所有提及的城市（中文 + 英文），返回中文名数组 */
function extractMentionedLocations(content: string): string[] {
  const locations: string[] = []
  for (const city of ZH_CITIES) {
    if (content.includes(city) && !locations.includes(city)) locations.push(city)
  }
  // 英文匹配（转中文便于社区过滤）
  for (const [en, zh] of Object.entries(EN_TO_ZH)) {
    const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (regex.test(content) && !locations.includes(zh)) locations.push(zh)
  }
  return locations
}

interface WeatherData {
  location: string
  temperature: number
  condition: string
  icon: string
  summary: string
}

/** 和风天气 icon 代码 → emoji 映射（简化版） */
function weatherIconMap(icon?: string): string {
  if (!icon) return ''
  const code = parseInt(icon, 10)
  const map: Record<number, string> = {
    100: '☀️', 101: '☁️', 102: '🌤️', 103: '🌥️', 104: '☁️',
    300: '🌦️', 301: '🌧️', 302: '⛈️', 303: '⛈️', 304: '🌩️', 305: '🌧️',
    306: '🌧️', 307: '🌨️', 308: '🌧️', 309: '🌧️', 310: '🌧️', 311: '🌧️',
    312: '🌧️', 313: '🌨️', 314: '🌨️', 315: '🌨️', 316: '🌨️', 317: '🌨️',
    318: '🌧️', 399: '🌧️',
    400: '❄️', 401: '🌨️', 402: '🌨️', 403: '🌨️', 404: '🌨️', 405: '🌨️',
    406: '🌨️', 407: '🌨️', 408: '🌨️', 409: '🌨️', 410: '🌨️', 499: '🌨️',
    500: '🌫️', 501: '🌫️', 502: '🌫️', 503: '🌪️', 504: '🌪️', 507: '🌪️', 508: '🌪️',
    509: '🌫️', 510: '🌫️', 511: '🌫️', 512: '🌫️', 513: '🌫️', 514: '🌫️', 515: '🌫️',
    900: '🔥', 901: '❄️', 999: '🔥',
  }
  return map[code] || ''
}

/** 根据温度 + 天气状况生成旅行摘要 */
function weatherSummary(now: { temp: string; text: string; humidity?: string; windSpeed?: string }): string {
  const temp = Number(now.temp) || 0
  const parts: string[] = []
  if (temp >= 30) parts.push('炎热注意防晒')
  else if (temp >= 25) parts.push('温暖适宜')
  else if (temp >= 15) parts.push('凉爽舒适')
  else if (temp >= 5) parts.push('偏凉需添衣')
  else parts.push('寒冷注意保暖')
  if (now.text && /雨|雪/.test(now.text)) parts.push('注意降水')
  return parts.join(' · ')
}

export default function AiAssistantPage() {
  const t = useTranslations('ai')
  const tc = useTranslations('common')
  const router = useRouter()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // ── Trip store integration ──
  const { currentTrip, nodes } = useTripStore()

  // ── Trip panel collapsed state ──
  const [tripPanelCollapsed, setTripPanelCollapsed] = React.useState(false)

  // ── Weather preview state ──
  const [weather, setWeather] = React.useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = React.useState(false)

  const { activeProviderId, customProviders, getActiveProvider, getApiKey } =
    useAiSettingsStore()

  /** 构建发送给服务端的 provider 请求体 */
  const buildProviderRequest = React.useCallback((): ProviderRequest | undefined => {
    const active = getActiveProvider()
    if (!active) return undefined
    // 内置提供商：仅传 id，key 由服务端 env 解析
    if (active.builtin) return { id: active.id }
    // 自定义提供商：传完整配置（含 apiKey）
    const key = getApiKey(active.id)
    if (!key) return undefined
    return {
      id: active.id,
      endpoint: active.endpoint,
      model: active.model,
      apiKey: key,
    }
  }, [getActiveProvider, getApiKey])

  // 新内容到达时自动滚动到底部
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 局部更新某条消息内容（流式追加用）
  const updateMessage = React.useCallback((id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)))
  }, [])

  // 调用流式接口，按 chunk 追加到目标 assistant 消息
  const streamReply = React.useCallback(
    async (history: Message[], assistantId: string) => {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            provider: buildProviderRequest(),
          }),
        })
        if (!res.ok || !res.body) throw new Error('network error')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          let chunk = decoder.decode(value, { stream: true })
          // 服务端以 [DONE] 标记结束，截断并终止
          const doneIdx = chunk.indexOf('[DONE]')
          if (doneIdx !== -1) {
            chunk = chunk.slice(0, doneIdx)
            acc += chunk
            if (acc) updateMessage(assistantId, acc)
            break
          }
          acc += chunk
          updateMessage(assistantId, acc)
        }

        // 刷新解码器尾部
        const tail = decoder.decode()
        if (tail) {
          acc += tail
          updateMessage(assistantId, acc)
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, error: true, content: tc('error') }
              : m,
          ),
        )
      }
    },
    [updateMessage, tc, buildProviderRequest],
  )

  const runConversation = React.useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || isStreaming) return

      const userMsg: Message = { id: genId(), role: 'user', content }
      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: '',
        streaming: true,
      }
      const history = [...messages, userMsg]
      setMessages([...history, assistantMsg])
      setInput('')
      // 重置输入框高度
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      setIsStreaming(true)
      await streamReply(history, assistantMsg.id)
      setIsStreaming(false)
    },
    [isStreaming, messages, streamReply],
  )

  // 重新生成：以最近一条 user 消息为锚，丢弃其后的 assistant 内容重新流式
  const handleRegenerate = React.useCallback(async () => {
    if (isStreaming) return
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i
        break
      }
    }
    if (lastUserIdx === -1) return

    const history = messages.slice(0, lastUserIdx + 1)
    const assistantMsg: Message = {
      id: genId(),
      role: 'assistant',
      content: '',
      streaming: true,
    }
    setMessages([...history, assistantMsg])

    setIsStreaming(true)
    await streamReply(history, assistantMsg.id)
    setIsStreaming(false)
  }, [isStreaming, messages, streamReply])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift + Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void runConversation(input)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // 自动撑高（最大 160px）
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }

  // ── Weather auto-fetch: detect location from input or active trip (debounced 400ms) ──
  React.useEffect(() => {
    const location =
      extractLocation(input) ||
      (currentTrip?.destination ?? null)

    if (!location) {
      setWeather(null)
      return
    }

    let cancelled = false
    setWeatherLoading(true)

    // 防抖：400ms 内若 input 再变化则取消本次请求
    const debounceTimer = setTimeout(() => {
      fetch(`/api/weather?location=${encodeURIComponent(location)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return
          if (data && data.configured !== false && data.now) {
            const now = data.now
            setWeather({
              location: location,
              temperature: Number(now.temp) || 0,
              condition: now.text || '',
              icon: weatherIconMap(now.icon),
              summary: weatherSummary(now),
            })
          } else {
            setWeather(null)
          }
        })
        .catch(() => {
          if (!cancelled) setWeather(null)
        })
        .finally(() => {
          if (!cancelled) setWeatherLoading(false)
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(debounceTimer)
    }
  }, [input, currentTrip?.destination])

  // ── Context-aware quick actions ──
  const quickActions = React.useMemo(() => {
    if (currentTrip) {
      const dest = currentTrip.destination || ''
      return [
        { label: '调整今日行程', prompt: `请帮我调整今天在${dest}的行程安排` },
        { label: `查看${dest}天气`, prompt: `${dest}今天的天气怎么样？适合出行吗？` },
        { label: '附近推荐餐厅', prompt: `在${dest}附近有什么推荐的餐厅吗？` },
        { label: '景点人流情况', prompt: `${dest}的热门景点目前人流情况如何？` },
      ]
    }
    return [
      { label: '规划一次旅行', prompt: '帮我规划一次旅行，我还没有确定目的地，请给我一些推荐' },
      { label: '热门目的地推荐', prompt: '最近有哪些热门目的地值得去？请给我推荐几个' },
      { label: '查看社区动态', prompt: '社区里最近有什么有趣的旅行动态和分享？' },
    ]
  }, [currentTrip])

  /** 快捷操作：将 prompt 填入输入框 */
  const handleQuickAction = React.useCallback(
    (prompt: string) => {
      setInput(prompt)
      textareaRef.current?.focus()
      // 自动撑高
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
      }
    },
    [],
  )

  /** 采纳行程方案：提取目的地写入 draft，跳转 trips 页 */
  const handleAdoptPlan = React.useCallback(
    (content: string) => {
      const dest = extractLocation(content)
      if (dest) {
        // 写入 draft 作为预填，trips 页 GenerateTripDialog 会读取
        useTripStore.getState().setDraft({ destination: dest })
        toast({ title: `已采纳方案，目的地：${dest}`, variant: 'success' })
      } else {
        toast({ title: '已采纳方案', variant: 'success' })
      }
      router.push('/trips')
    },
    [router],
  )

  return (
    <div className="flex h-full flex-col bg-surface-canvas">
      {/* Header */}
      <header className="glass-navbar flex h-14 shrink-0 items-center justify-between gap-2.5 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-hover text-white shadow-accent">
            <Bot className="h-4 w-4" />
          </div>
          <h1 className="text-body-lg font-semibold text-ink-primary">{t('title')}</h1>
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-muted px-2.5 py-1.5 text-caption text-accent transition-all hover:bg-accent hover:text-white"
          aria-label={t('settings')}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {BUILTIN_PROVIDERS.find((p) => p.id === activeProviderId)?.name ??
              customProviders.find((p) => p.id === activeProviderId)?.name ??
              t('notSet')}
          </span>
        </button>
      </header>

      {/* Messages */}
      <div className="apple-scrollbar flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {/* ── Trip Quick-Access Panel ── */}
          {currentTrip && (
            <TripQuickAccessPanel
              trip={currentTrip}
              nodeCount={nodes.length}
              collapsed={tripPanelCollapsed}
              onToggle={() => setTripPanelCollapsed((v) => !v)}
            />
          )}

          {messages.length === 0 ? (
            <WelcomeState
              welcome={t('welcome')}
              actions={quickActions}
              disabled={isStreaming}
              onPick={handleQuickAction}
              hasActiveTrip={!!currentTrip}
            />
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
                  thinkingLabel={t('thinking')}
                  acceptLabel={t('acceptPlan')}
                  regenerateLabel={t('regenerate')}
                  retryLabel={tc('retry')}
                  onRegenerate={handleRegenerate}
                  onAdoptPlan={handleAdoptPlan}
                  tripId={currentTrip?.id}
                />
              ))}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 bg-surface-elevated/60 p-4 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl bg-white/80 p-2 shadow-md transition-all focus-within:ring-2 focus-within:ring-accent dark:bg-gray-700/40">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={t('placeholder')}
              className="min-h-[40px] max-h-[160px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-body text-ink-primary shadow-none placeholder:text-ink-quaternary focus-visible:border-0 focus-visible:ring-0"
            />
            <Button
              size="icon"
              onClick={() => void runConversation(input)}
              disabled={isStreaming || !input.trim()}
              aria-label={t('send')}
              className="h-9 w-9 shrink-0 rounded-xl bg-accent text-white shadow-accent hover:bg-accent-hover"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* ── Weather Preview Card ── */}
          {(weatherLoading || weather) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-2 flex items-center gap-3 rounded-xl bg-accent-muted/60 px-3.5 py-2"
            >
              {weatherLoading ? (
                <div className="flex items-center gap-2 text-caption text-ink-quaternary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>查询天气中...</span>
                </div>
              ) : weather ? (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-lg">
                    {weather.icon || <Cloud className="h-4 w-4 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-body-sm font-semibold text-ink-primary">
                        {weather.temperature}°C
                      </span>
                      <span className="text-caption text-ink-secondary">
                        {weather.condition} · {weather.location}
                      </span>
                    </div>
                    {weather.summary && (
                      <p className="truncate text-caption text-ink-quaternary">
                        {weather.summary}
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          )}

          <p className="mt-2 text-center text-caption text-ink-quaternary">
            {t('inputHint')}
          </p>
        </div>
      </div>

      {/* AI 提供商设置弹窗 */}
      <AiSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 子组件                                                                       */
/* -------------------------------------------------------------------------- */

/** 助手头像圆点 */
function AssistantAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white shadow-sm',
        className,
      )}
    >
      <Bot className="h-4 w-4" />
    </div>
  )
}

/** 用户头像圆点 */
function UserAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent shadow-xs">
      <User className="h-4 w-4" />
    </div>
  )
}

/** 思考中：三点跳动指示器 */
function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-body-sm text-ink-quaternary">{label}</span>
    </div>
  )
}

/** 行程快捷访问面板：显示当前活跃行程摘要 */
function TripQuickAccessPanel({
  trip,
  nodeCount,
  collapsed,
  onToggle,
}: {
  trip: { id: string; destination: string; start_date: string; end_date: string }
  nodeCount: number
  collapsed: boolean
  onToggle: () => void
}) {
  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } catch {
      return d
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="overflow-hidden rounded-xl border-l-[3px] border-accent bg-white/70 shadow-sm backdrop-blur-md dark:bg-gray-700/30"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-accent/5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-muted text-accent">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-body-sm font-medium text-ink-primary">
              {trip.destination}
            </span>
            <div className="flex items-center gap-3 text-caption text-ink-quaternary">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {nodeCount} 个节点
              </span>
            </div>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-ink-quaternary" />
        ) : (
          <ChevronUp className="h-4 w-4 text-ink-quaternary" />
        )}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between border-t border-accent/10 px-4 py-2.5">
              <span className="text-caption text-ink-tertiary">
                当前行程进行中，AI 可以帮你优化安排
              </span>
              <Link
                href={`/trips?selected=${trip.id}`}
                className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-caption font-medium text-white transition-colors hover:bg-accent-hover"
              >
                查看详情
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** 助手消息 Markdown 渲染（支持 GFM：表格/删除线/任务列表等） */
function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="mb-2 mt-3 text-body-lg font-bold text-ink-primary" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mb-2 mt-3 text-body font-bold text-ink-primary" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mb-1.5 mt-2 text-body-sm font-semibold text-ink-primary" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 leading-relaxed last:mb-0" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-ink-primary" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-ink-secondary" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-2 border-l-2 border-accent bg-accent-muted py-1 pl-3 text-ink-secondary"
              {...props}
            />
          ),
          code: ({ node, className, ...props }) => {
            const isBlock = className?.includes('language-')
            if (isBlock) {
              return (
                <code
                  className="block overflow-x-auto rounded-md bg-neutral-900 px-3 py-2 text-caption text-neutral-100"
                  {...props}
                />
              )
            }
            return (
              <code
                className="rounded bg-surface-muted px-1 py-0.5 text-caption text-accent"
                {...props}
              />
            )
          },
          pre: ({ node, ...props }) => (
            <pre className="my-2" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-3 border-accent/15" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-caption" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-accent/15 bg-accent-muted px-2 py-1 text-left font-semibold text-accent" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-accent/15 px-2 py-1" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

/** 行程方案卡片：含「采纳这个方案」+「查看地图」入口 */
function TripPlanCard({
  content,
  acceptLabel,
  tripId,
  onAccept,
}: {
  content: string
  acceptLabel: string
  tripId?: string
  onAccept: () => void
}) {
  const [adopted, setAdopted] = React.useState(false)
  return (
    <div className="overflow-hidden rounded-2xl bg-accent-muted shadow-md">
      <div className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hover px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-white" />
        <span className="text-body-sm font-semibold text-white">
          行程方案卡片
        </span>
      </div>
      <div className="px-4 py-3">
        <p className="line-clamp-4 whitespace-pre-wrap break-words text-body-sm text-ink-secondary">
          {content}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-accent text-white hover:bg-accent-hover"
            disabled={adopted}
            onClick={() => {
              onAccept()
              setAdopted(true)
            }}
          >
            <Check className="h-4 w-4" />
            {adopted ? '已采纳' : acceptLabel}
          </Button>
          {tripId && (
            <Button asChild size="sm" variant="outline" className="shrink-0 border-accent/30 text-accent hover:bg-accent-muted">
              <Link href={`/trips?selected=${tripId}`}>
                <MapPin className="h-4 w-4" />
                查看地图
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/** 重新生成 / 重试 按钮 */
function ActionButton({
  onClick,
  label,
  tone,
}: {
  onClick: () => void
  label: string
  tone: 'muted' | 'error'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-body-sm transition-colors hover:underline',
        tone === 'error' ? 'text-danger hover:text-danger' : 'text-ink-quaternary hover:text-ink-secondary',
      )}
    >
      <RefreshCw className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

/** 欢迎态：助手问候 + 上下文感知快捷操作 */
function WelcomeState({
  welcome,
  actions,
  disabled,
  onPick,
  hasActiveTrip,
}: {
  welcome: string
  actions: { label: string; prompt: string }[]
  disabled: boolean
  onPick: (prompt: string) => void
  hasActiveTrip: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex flex-col gap-6"
    >
      <div className="flex items-start gap-3">
        <AssistantAvatar />
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md dark:bg-gray-700/40">
          <p className="whitespace-pre-wrap break-words text-body text-ink-secondary">
            {welcome}
          </p>
          {hasActiveTrip && (
            <p className="mt-2 text-caption text-accent">
              检测到你有正在进行的行程，我可以帮你优化安排。
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pl-11">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(a.prompt)}
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-2 text-body-sm text-ink-secondary shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-white hover:shadow-accent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700/40"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent transition-transform group-hover:scale-110 group-hover:text-white" />
            {a.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/** 单条消息气泡 */
function MessageBubble({
  message,
  isLast,
  thinkingLabel,
  acceptLabel,
  regenerateLabel,
  retryLabel,
  onRegenerate,
  onAdoptPlan,
  tripId,
}: {
  message: Message
  isLast: boolean
  thinkingLabel: string
  acceptLabel: string
  regenerateLabel: string
  retryLabel: string
  onRegenerate: () => void
  onAdoptPlan: (content: string) => void
  tripId?: string
}) {
  const isUser = message.role === 'user'
  const showThinking = !isUser && !!message.streaming && !message.content
  const showPlan = !isUser && hasPlan(message.content) && !showThinking
  const isError = !!message.error
  const showActions = !isUser && !message.streaming

  // 检测 AI 回复中提及的地点（用于社区链接）
  const mentionedLocations = React.useMemo(() => {
    if (isUser || message.streaming || !message.content) return []
    return extractMentionedLocations(message.content)
  }, [isUser, message.streaming, message.content])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={cn(
        'flex items-start gap-3',
        isUser && 'flex-row-reverse',
      )}
    >
      {isUser ? <UserAvatar /> : <AssistantAvatar />}

      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-2',
          isUser && 'items-end',
        )}
      >
        {showThinking ? (
          <div className="rounded-2xl rounded-bl-md bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md dark:bg-gray-700/40">
            <ThinkingDots label={thinkingLabel} />
          </div>
        ) : (
          <div
            className={cn(
              'break-words px-4 py-3 text-body',
              isError
                ? 'whitespace-pre-wrap rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 text-danger shadow-sm'
                : isUser
                  ? 'whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent text-white shadow-accent'
                  : 'rounded-2xl rounded-bl-md bg-white/80 text-ink-secondary shadow-sm backdrop-blur-md dark:bg-gray-700/40',
            )}
          >
            {isUser || isError ? (
              message.content
            ) : (
              <MarkdownContent>{message.content}</MarkdownContent>
            )}
          </div>
        )}

        {showPlan && (
          <TripPlanCard
            content={message.content}
            acceptLabel={acceptLabel}
            tripId={tripId}
            onAccept={() => onAdoptPlan(message.content)}
          />
        )}

        {/* ── Community link: when AI response mentions locations ── */}
        {mentionedLocations.length > 0 && (
          <Link
            href={`/community?location=${encodeURIComponent(mentionedLocations[0])}`}
            className="inline-flex items-center gap-1.5 text-caption text-accent transition-colors hover:text-accent-hover hover:underline"
          >
            <Users className="h-3.5 w-3.5" />
            查看社区相关讨论
            <span className="text-ink-quaternary">
              ({mentionedLocations.join('、')})
            </span>
          </Link>
        )}

        {showActions &&
          (isError ? (
            <ActionButton onClick={onRegenerate} label={retryLabel} tone="error" />
          ) : isLast ? (
            <ActionButton onClick={onRegenerate} label={regenerateLabel} tone="muted" />
          ) : null)}
      </div>
    </motion.div>
  )
}
