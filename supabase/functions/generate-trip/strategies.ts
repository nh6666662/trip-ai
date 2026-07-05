// supabase/functions/generate-trip/strategies.ts
// 策略模式 — 多版本行程生成算法
// 参考《项目总纲.md》4.3.2

// ---------- 类型定义 ----------

// 景点（与 spots 表结构对齐）
export interface Spot {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
  latitude: number
  longitude: number
  min_visit_minutes: number
  recommended_minutes: number
  rating?: number | null
  tags?: string[] | null
  opening_time?: string | null
  closing_time?: string | null
}

// 生成参数
export interface GenerateParams {
  spots: Spot[]
  dateRange: { start: string; end: string }
  preferences?: string[] | null
}

// 行程节点（与 trip_nodes 表结构对齐）
export interface TripNode {
  id: string
  spot_id: string | null
  name: string
  node_type: 'spot' | 'meal' | 'rest' | 'transit' | 'custom'
  start_time: string
  duration_minutes: number
  transit_minutes: number
  sort_order: number
  metadata?: Record<string, unknown>
}

// 策略生成结果
export interface GeneratedTrip {
  nodes: TripNode[]
  pace: 'tight' | 'relaxed'
}

// 策略接口
export interface TripGenerationStrategy {
  generate(params: GenerateParams): GeneratedTrip
}

// ---------- 日期 / 时间辅助函数（自包含，避免引入 @/ 别名） ----------

// 计算两个日期之间的天数（含起止，至少 1 天）
export function daysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000)
  return Math.max(1, diff + 1)
}

// 在给定 Date 上增加若干分钟，返回新的 Date
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

// 把指定小时/分钟设置到某一天（保持日期不变，仅替换时间）
export function setTimeOnDate(date: Date, hours: number, minutes = 0): Date {
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d
}

// haversine 距离（米），用于景点近邻排序
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------- 紧凑策略 ----------

// 8:00 出发，最小化休息，最大化景点覆盖
// 贪心近邻排序，12:00 左右插入午餐，交通约 20 分钟
export class TightStrategy implements TripGenerationStrategy {
  private readonly START_HOUR = 8
  private readonly LUNCH_HOUR = 12
  private readonly END_HOUR = 18
  private readonly LUNCH_DURATION = 60
  private readonly TRANSIT = 20

  generate(params: GenerateParams): GeneratedTrip {
    const { spots, dateRange } = params
    const days = daysBetween(dateRange.start, dateRange.end)
    // 贪心近邻排序，最小化总路程
    const sorted = this.sortByProximity(spots)

    const nodes: TripNode[] = []
    let sortOrder = 0
    const base = new Date(dateRange.start + 'T00:00:00')

    let spotIdx = 0
    for (let d = 0; d < days && spotIdx < sorted.length; d++) {
      const day = new Date(base)
      day.setDate(base.getDate() + d)
      let currentTime = setTimeOnDate(day, this.START_HOUR)
      let lunchInserted = false

      while (spotIdx < sorted.length) {
        // 跨过 12:00 时插入午餐
        if (!lunchInserted && currentTime.getHours() >= this.LUNCH_HOUR) {
          nodes.push({
            id: crypto.randomUUID(),
            spot_id: null,
            name: '午餐',
            node_type: 'meal',
            start_time: currentTime.toISOString(),
            duration_minutes: this.LUNCH_DURATION,
            transit_minutes: 0,
            sort_order: sortOrder++,
            metadata: { pace: 'tight' },
          })
          currentTime = addMinutes(currentTime, this.LUNCH_DURATION)
          lunchInserted = true
        }

        const spot = sorted[spotIdx]
        const visit = spot.min_visit_minutes || 60

        nodes.push({
          id: crypto.randomUUID(),
          spot_id: spot.id,
          name: spot.name,
          node_type: 'spot',
          start_time: currentTime.toISOString(),
          duration_minutes: visit,
          transit_minutes: this.TRANSIT,
          sort_order: sortOrder++,
          metadata: { pace: 'tight' },
        })
        currentTime = addMinutes(currentTime, visit + this.TRANSIT)
        spotIdx++

        // 到达 18:00 结束当天
        if (currentTime.getHours() >= this.END_HOUR) break
      }
    }

    return { nodes, pace: 'tight' }
  }

  // 贪心近邻排序：从首个景点出发，每次选取最近的未访问景点
  private sortByProximity(spots: Spot[]): Spot[] {
    if (spots.length <= 1) return [...spots]
    const remaining = [...spots]
    const sorted: Spot[] = []
    let current = remaining.shift()!
    sorted.push(current)
    while (remaining.length > 0) {
      let nearestIdx = 0
      let nearestDist = Number.POSITIVE_INFINITY
      for (let i = 0; i < remaining.length; i++) {
        const dist = haversineMeters(
          current.latitude, current.longitude,
          remaining[i].latitude, remaining[i].longitude
        )
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIdx = i
        }
      }
      current = remaining.splice(nearestIdx, 1)[0]
      sorted.push(current)
    }
    return sorted
  }
}

// ---------- 松弛策略 ----------

// 9:00 出发，每日最多 3 个核心景点
// 每个景点后插入 45 分钟休息缓冲，12:00 左右 90 分钟餐歇，交通约 25 分钟
export class RelaxedStrategy implements TripGenerationStrategy {
  private readonly START_HOUR = 9
  private readonly MAX_CORE_PER_DAY = 3
  private readonly REST_BUFFER = 45
  private readonly MEAL_DURATION = 90
  private readonly TRANSIT = 25
  private readonly LUNCH_HOUR = 12

  generate(params: GenerateParams): GeneratedTrip {
    const { spots, dateRange } = params
    const days = daysBetween(dateRange.start, dateRange.end)
    // 每日最多 3 个核心景点
    const curated = spots.slice(0, days * this.MAX_CORE_PER_DAY)

    const nodes: TripNode[] = []
    let sortOrder = 0
    const base = new Date(dateRange.start + 'T00:00:00')

    let spotIdx = 0
    for (let d = 0; d < days && spotIdx < curated.length; d++) {
      const day = new Date(base)
      day.setDate(base.getDate() + d)
      let currentTime = setTimeOnDate(day, this.START_HOUR)
      let coreCount = 0
      let lunchInserted = false

      while (spotIdx < curated.length && coreCount < this.MAX_CORE_PER_DAY) {
        // 跨过 12:00 插入 90 分钟餐歇
        if (!lunchInserted && currentTime.getHours() >= this.LUNCH_HOUR) {
          nodes.push({
            id: crypto.randomUUID(),
            spot_id: null,
            name: '午餐',
            node_type: 'meal',
            start_time: currentTime.toISOString(),
            duration_minutes: this.MEAL_DURATION,
            transit_minutes: 0,
            sort_order: sortOrder++,
            metadata: { pace: 'relaxed' },
          })
          currentTime = addMinutes(currentTime, this.MEAL_DURATION)
          lunchInserted = true
        }

        const spot = curated[spotIdx]
        const visit = spot.recommended_minutes || 120

        nodes.push({
          id: crypto.randomUUID(),
          spot_id: spot.id,
          name: spot.name,
          node_type: 'spot',
          start_time: currentTime.toISOString(),
          duration_minutes: visit,
          transit_minutes: this.TRANSIT,
          sort_order: sortOrder++,
          metadata: { pace: 'relaxed' },
        })
        currentTime = addMinutes(currentTime, visit)

        // 每个景点后插入休息缓冲
        nodes.push({
          id: crypto.randomUUID(),
          spot_id: null,
          name: '休息',
          node_type: 'rest',
          start_time: currentTime.toISOString(),
          duration_minutes: this.REST_BUFFER,
          transit_minutes: 0,
          sort_order: sortOrder++,
          metadata: { pace: 'relaxed' },
        })
        currentTime = addMinutes(currentTime, this.REST_BUFFER + this.TRANSIT)

        coreCount++
        spotIdx++
      }
    }

    return { nodes, pace: 'relaxed' }
  }
}

// ---------- 策略工厂 ----------

// 根据节奏创建对应策略
export function createStrategy(pace: 'tight' | 'relaxed'): TripGenerationStrategy {
  switch (pace) {
    case 'tight':
      return new TightStrategy()
    case 'relaxed':
      return new RelaxedStrategy()
    default:
      return new RelaxedStrategy()
  }
}
