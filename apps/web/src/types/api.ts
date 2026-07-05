// API 请求/响应类型（前后端共享）
import type {
  Trip,
  TripNode,
  UGCReport,
  Spot,
  RealtimeAlert,
} from "@/types/database";

/** 行程生成请求体 */
export interface GenerateTripRequest {
  destination: string;
  departure?: string;
  start_date: string;
  end_date: string;
  pace: "tight" | "relaxed";
  traveler_count: number;
  preferences: string[];
}

/** 行程生成响应（含节点） */
export interface GenerateTripResponse {
  trip: Trip;
  nodes: TripNode[];
}

/** 行程列表项（含节点数概要） */
export interface TripListItem extends Trip {
  node_count?: number;
}

/** UGC 信息流项（关联景点与作者概要） */
export interface UgcFeedItem extends UGCReport {
  spot?: Pick<Spot, "id" | "name" | "image_url">;
  author_name?: string | null;
  author_avatar?: string | null;
}

/** AI 对话请求 */
export interface AiChatRequest {
  messages: AiMessage[];
  context?: Record<string, unknown>;
}

export interface AiMessage {
  role: "user" | "assistant" | "system";
  content: string;
  /** 关联的行程方案卡片（assistant 可附带的建议行程） */
  trip_card?: GenerateTripResponse;
}

export interface AiChatResponse {
  message: AiMessage;
}

/** 标准 API 错误响应 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
}
