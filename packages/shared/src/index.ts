// @trip-ai/shared — 共享常量与类型

/** API 端点 */
export const API_ENDPOINTS = {
  trips: '/api/trips',
  tripById: (id: string) => `/api/trips/${id}`,
  tripGenerate: '/api/trips/generate',
  ugcReports: '/api/ugc/reports',
  ugcFeed: '/api/ugc/feed',
  aiChat: '/api/ai/chat',
} as const

/** 行程节奏 */
export type TripPace = 'tight' | 'relaxed'

/** 行程节点类型 */
export type TripNodeType = 'spot' | 'meal' | 'rest' | 'transit' | 'shopping' | 'custom'

/** 预警类型 */
export type AlertType = 'traffic' | 'weather' | 'crowd' | 'facility'

/** 预警优先级 */
export type AlertPriority = 'high' | 'medium' | 'low'

/** UGC 状态 */
export type UGCStatus = 'pending' | 'verified' | 'rejected'

/** 置信度阈值 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.3,
} as const

/** 地理围栏半径（米） */
export const GEOFENCE_RADIUS = 500
