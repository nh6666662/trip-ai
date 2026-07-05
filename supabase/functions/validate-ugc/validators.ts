// supabase/functions/validate-ugc/validators.ts
// 装饰器模式 — UGC 多维度可信度验证
// 参考《项目总纲.md》4.3.3

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------- 类型定义 ----------

// UGC 上报数据（含关联景点信息）
export interface UGCReport {
  id: string
  user_id: string
  spot_id: string
  content: string | null
  photos: string[] | null
  user_lat: number | null
  user_lng: number | null
  created_at: string
  // 关联景点字段（用于围栏与开放时间校验）
  spot_lat: number | null
  spot_lng: number | null
  spot_opening_time: string | null
}

// 验证结果
export interface UGCValidationResult {
  accepted: boolean
  pending: boolean
  rejected: boolean
  confidence: number
  note?: string
}

// 验证器接口
export interface UGCValidator {
  validate(report: UGCReport): Promise<UGCValidationResult>
}

// ---------- haversine 距离工具 ----------

// 计算两个经纬度坐标之间的球面距离（返回米）
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // 地球半径（米）
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ---------- 基础验证器 ----------

// 检查内容非空 + spot_id 存在
export class BaseValidator implements UGCValidator {
  async validate(report: UGCReport): Promise<UGCValidationResult> {
    const hasContent =
      (report.content != null && report.content.trim().length > 0) ||
      (report.photos != null && report.photos.length > 0)

    if (!hasContent) {
      return {
        accepted: false,
        pending: false,
        rejected: true,
        confidence: 0,
        note: '内容不能为空',
      }
    }
    if (!report.spot_id) {
      return {
        accepted: false,
        pending: false,
        rejected: true,
        confidence: 0,
        note: '必须关联一个地点',
      }
    }
    return { accepted: true, pending: false, rejected: false, confidence: 0.3 }
  }
}

// ---------- 地理围栏验证器（装饰器） ----------

// haversine 距离，MAX_DISTANCE 500m，500m 内置信度 +0.3
export class GeoFenceValidator implements UGCValidator {
  private readonly MAX_DISTANCE = 500 // 米
  constructor(private inner: UGCValidator) {}

  async validate(report: UGCReport): Promise<UGCValidationResult> {
    const base = await this.inner.validate(report)
    if (base.rejected) return base

    // 缺少定位坐标，标记为待定
    if (
      report.user_lat == null ||
      report.user_lng == null ||
      report.spot_lat == null ||
      report.spot_lng == null
    ) {
      return {
        ...base,
        accepted: false,
        pending: true,
        note: base.note ?? '缺少定位坐标，待补充',
      }
    }

    const distance = haversineDistance(
      report.user_lat,
      report.user_lng,
      report.spot_lat,
      report.spot_lng
    )

    if (distance > this.MAX_DISTANCE) {
      return {
        ...base,
        accepted: false,
        pending: true,
        note: `距景点 ${Math.round(distance)}m，超出围栏`,
      }
    }

    return { ...base, confidence: Math.min(base.confidence + 0.3, 1) }
  }
}

// ---------- 时间一致性验证器（装饰器） ----------

// 上报超过 2 小时置信度 *0.7；早于开放时间标记为待定
export class TimeConsistencyValidator implements UGCValidator {
  constructor(private inner: UGCValidator) {}

  async validate(report: UGCReport): Promise<UGCValidationResult> {
    const base = await this.inner.validate(report)
    if (base.rejected) return base

    const ageHours =
      (Date.now() - new Date(report.created_at).getTime()) / 3600000
    if (ageHours > 2) {
      return {
        ...base,
        confidence: base.confidence * 0.7,
        note: '上报超过 2 小时',
      }
    }

    // 开放时间为 TIME 字段（HH:mm:ss），需结合上报日期判断
    if (report.spot_opening_time) {
      const reportTime = new Date(report.created_at)
      const parts = report.spot_opening_time.split(':').map(Number)
      const opening = new Date(reportTime)
      opening.setHours(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, 0)
      if (reportTime < opening) {
        return {
          ...base,
          accepted: false,
          pending: true,
          confidence: base.confidence * 0.5,
          note: '早于景点开放时间',
        }
      }
    }

    return base
  }
}

// ---------- 用户信誉验证器（装饰器） ----------

// 查询 user_profiles.reputation_score
// 信誉 > 0.8 置信度 +0.2；信誉 < 0.3 标记为待定并 *0.5
export class UserReputationValidator implements UGCValidator {
  constructor(
    private inner: UGCValidator,
    private supabase: SupabaseClient
  ) {}

  async validate(report: UGCReport): Promise<UGCValidationResult> {
    const base = await this.inner.validate(report)
    if (base.rejected) return base

    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('reputation_score')
      .eq('id', report.user_id)
      .single()

    const reputation = profile?.reputation_score ?? 0.5
    if (reputation > 0.8) {
      return { ...base, confidence: Math.min(base.confidence + 0.2, 1) }
    }
    if (reputation < 0.3) {
      return {
        ...base,
        accepted: false,
        pending: true,
        confidence: base.confidence * 0.5,
        note: '用户信誉较低，建议人工复审',
      }
    }

    return base
  }
}

// ---------- 组装验证链 ----------

// 验证链：UserReputation(TimeConsistency(GeoFence(Base)))
export function buildValidatorChain(
  supabase: SupabaseClient
): UGCValidator {
  return new UserReputationValidator(
    new TimeConsistencyValidator(
      new GeoFenceValidator(new BaseValidator())
    ),
    supabase
  )
}
