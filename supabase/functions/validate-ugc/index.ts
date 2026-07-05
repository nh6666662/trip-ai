// supabase/functions/validate-ugc/index.ts
// UGC 验证 Edge Function — 装饰器模式
// 参考《项目总纲.md》4.3.3

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildValidatorChain, type UGCReport } from './validators.ts'

// 统一 JSON 响应
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  try {
    const { report_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. 获取 UGC 上报 + 关联景点（lat / lng / opening_time）
    const { data: report, error: fetchError } = await supabase
      .from('ugc_reports')
      .select(
        'id, user_id, spot_id, content, photos, user_lat, user_lng, created_at, spots ( latitude, longitude, opening_time )'
      )
      .eq('id', report_id)
      .single()

    if (fetchError || !report) {
      return jsonResponse(
        { error: 'UGC 上报不存在', detail: fetchError?.message },
        404
      )
    }

    // 关联景点字段可能为数组或对象，统一展平
    const rawSpot = (report as Record<string, unknown>).spots
    const spot = Array.isArray(rawSpot) ? rawSpot[0] ?? {} : rawSpot ?? {}

    const fullReport: UGCReport = {
      id: report.id,
      user_id: report.user_id,
      spot_id: report.spot_id,
      content: report.content,
      photos: report.photos,
      user_lat: report.user_lat,
      user_lng: report.user_lng,
      created_at: report.created_at,
      spot_lat: spot.latitude ?? null,
      spot_lng: spot.longitude ?? null,
      spot_opening_time: spot.opening_time ?? null,
    }

    // 2. 运行验证链
    const validator = buildValidatorChain(supabase)
    const result = await validator.validate(fullReport)

    // 3. 根据置信度决定状态
    // confidence >= 0.7 → verified；0.3..0.7 → pending；<0.3 → rejected
    let status: string
    if (result.confidence >= 0.7) {
      status = 'verified'
    } else if (result.confidence >= 0.3) {
      status = 'pending'
    } else {
      status = 'rejected'
    }

    // 4. 更新 ugc_reports 行
    const { error: updateError } = await supabase
      .from('ugc_reports')
      .update({ confidence: result.confidence, status })
      .eq('id', report_id)

    if (updateError) {
      return jsonResponse(
        { error: '状态更新失败', detail: updateError.message },
        500
      )
    }

    return jsonResponse({ report_id, status, ...result })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
})
