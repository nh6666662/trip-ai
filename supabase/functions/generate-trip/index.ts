// supabase/functions/generate-trip/index.ts
// AI 行程生成 Edge Function — 策略模式
// 参考《项目总纲.md》4.3.2

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createStrategy, type Spot } from './strategies.ts'

// 数据库无景点时的兜底样本列表
const SAMPLE_SPOTS: Spot[] = [
  {
    id: 'sample-1',
    name: '城市中心广场',
    description: '城市地标广场，适合漫步打卡',
    image_url: null,
    latitude: 31.2304,
    longitude: 121.4737,
    min_visit_minutes: 60,
    recommended_minutes: 120,
    rating: 4.5,
    tags: ['landmark'],
    opening_time: '08:00:00',
    closing_time: '22:00:00',
  },
  {
    id: 'sample-2',
    name: '历史文化博物馆',
    description: '了解当地历史文化的最佳去处',
    image_url: null,
    latitude: 31.235,
    longitude: 121.475,
    min_visit_minutes: 90,
    recommended_minutes: 150,
    rating: 4.7,
    tags: ['museum', 'culture'],
    opening_time: '09:00:00',
    closing_time: '17:00:00',
  },
  {
    id: 'sample-3',
    name: '滨江公园',
    description: '沿江休闲绿地，适合放松',
    image_url: null,
    latitude: 31.24,
    longitude: 121.46,
    min_visit_minutes: 45,
    recommended_minutes: 90,
    rating: 4.3,
    tags: ['park', 'nature'],
    opening_time: '06:00:00',
    closing_time: '21:00:00',
  },
  {
    id: 'sample-4',
    name: '特色美食街',
    description: '汇聚当地特色小吃的美食街区',
    image_url: null,
    latitude: 31.228,
    longitude: 121.47,
    min_visit_minutes: 60,
    recommended_minutes: 90,
    rating: 4.6,
    tags: ['food'],
    opening_time: '10:00:00',
    closing_time: '22:00:00',
  },
  {
    id: 'sample-5',
    name: '观景山塔',
    description: '登高俯瞰城市全景',
    image_url: null,
    latitude: 31.245,
    longitude: 121.48,
    min_visit_minutes: 75,
    recommended_minutes: 120,
    rating: 4.4,
    tags: ['viewpoint', 'nature'],
    opening_time: '08:30:00',
    closing_time: '18:00:00',
  },
  {
    id: 'sample-6',
    name: '艺术创意园区',
    description: '文创与艺术展览聚集地',
    image_url: null,
    latitude: 31.222,
    longitude: 121.465,
    min_visit_minutes: 60,
    recommended_minutes: 120,
    rating: 4.2,
    tags: ['art', 'culture'],
    opening_time: '10:00:00',
    closing_time: '20:00:00',
  },
]

// 统一 JSON 响应
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  try {
    const {
      destination,
      pace,
      date_range,
      preferences,
      user_id,
    } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. 查询景点：先按目的地模糊匹配，命中为空则回退到全部，仍为空则用兜底样本
    let spots: Spot[] = []
    if (destination) {
      const { data } = await supabase
        .from('spots')
        .select('*')
        .ilike('name', `%${destination}%`)
        .limit(12)
      spots = (data as Spot[] | null) ?? []
    }

    if (spots.length === 0) {
      const { data } = await supabase
        .from('spots')
        .select('*')
        .limit(12)
      spots = (data as Spot[] | null) ?? []
    }

    if (spots.length === 0) {
      spots = SAMPLE_SPOTS
    }

    // 2. 运行策略生成节点
    const strategy = createStrategy(pace === 'tight' ? 'tight' : 'relaxed')
    const { nodes } = strategy.generate({
      spots,
      dateRange: date_range,
      preferences,
    })

    // 3. 写入 trips 表
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        user_id,
        destination,
        start_date: date_range.start,
        end_date: date_range.end,
        pace: pace === 'tight' ? 'tight' : 'relaxed',
        preferences,
        status: 'draft',
      })
      .select()
      .single()

    if (tripError || !trip) {
      return jsonResponse(
        { error: '行程写入失败', detail: tripError?.message },
        500
      )
    }

    // 4. 写入 trip_nodes 表（带 sort_order）
    const { data: insertedNodes, error: nodesError } = await supabase
      .from('trip_nodes')
      .insert(
        nodes.map((n) => ({
          id: n.id,
          trip_id: trip.id,
          spot_id: n.spot_id,
          name: n.name,
          node_type: n.node_type,
          start_time: n.start_time,
          duration_minutes: n.duration_minutes,
          transit_minutes: n.transit_minutes,
          sort_order: n.sort_order,
          metadata: n.metadata ?? {},
        }))
      )
      .select()

    if (nodesError) {
      return jsonResponse(
        { error: '行程节点写入失败', detail: nodesError.message },
        500
      )
    }

    return jsonResponse({ trip, nodes: insertedNodes })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
})
