/**
 * Harness Engineering — 旅行规划多维度分析维度定义
 *
 * 对应《项目总纲.md》4.3 设计模式 + Harness Engineering 架构
 * 每个维度有独立权重、数据源、评分函数，由编排层统一调度。
 *
 * 维度设计原则：
 * - 权重总和 = 100%
 * - 每个维度可独立评分（0-100 分）
 * - 加权总分用于景点排序和行程优化
 */

// ===== 维度定义 =====

export interface AnalysisDimension {
  /** 维度唯一标识 */
  id: string;
  /** 维度名称 */
  name: string;
  /** 权重（0-1，所有维度权重之和 = 1） */
  weight: number;
  /** 维度描述 */
  description: string;
  /** 数据来源 */
  source: string;
  /** 该维度评分（0-100） */
  score?: number;
  /** 评分理由 */
  reason?: string;
}

/**
 * 八大分析维度及权重分配
 *
 * 权重分配逻辑：
 * - 天气（20%）：对旅行体验影响最直接，雨天直接改变行程安排
 * - 景点质量（20%）：核心旅行目标，评分和口碑决定值得去程度
 * - 人流密度（15%）：排队等候严重影响体验，且可主动避开
 * - 交通便利（15%）：景点间通勤消耗时间精力，影响行程可行性
 * - 餐饮配套（10%）：基本需求，景点周边有没有好吃的很重要
 * - 偏好匹配（10%）：个性化体验，亲子/美食/文化各有侧重
 * - 预算合理（5%）：MVP 阶段数据有限，作为辅助参考
 * - 时间效率（5%）：路线连贯性和体力分配，策略层已处理
 */
export const DIMENSIONS: AnalysisDimension[] = [
  {
    id: 'weather',
    name: '天气适宜度',
    weight: 0.20,
    description: '当日天气预报对户外活动的影响程度',
    source: '和风天气 API / 高德天气',
  },
  {
    id: 'attraction_quality',
    name: '景点质量',
    weight: 0.20,
    description: '景点评分、口碑、知名度综合质量',
    source: '高德 POI biz_ext.rating + UGC 评分',
  },
  {
    id: 'crowd_level',
    name: '人流密度',
    weight: 0.15,
    description: '景点当前或预测人流量，低人流 = 高体验',
    source: '高德 POI 热度 + UGC 上报 + 时段规则',
  },
  {
    id: 'transport',
    name: '交通便利性',
    weight: 0.15,
    description: '景点间通勤时间与交通方式便捷程度',
    source: '高德路径规划 API',
  },
  {
    id: 'dining',
    name: '餐饮配套',
    weight: 0.10,
    description: '景点周边餐饮质量与数量',
    source: '高德 POI 餐饮搜索',
  },
  {
    id: 'preference_match',
    name: '偏好匹配度',
    weight: 0.10,
    description: '景点类型与用户偏好标签的匹配程度',
    source: '用户输入 + POI type 字段',
  },
  {
    id: 'budget',
    name: '预算合理性',
    weight: 0.05,
    description: '门票 + 餐饮 + 交通的综合花费',
    source: '高德 POI biz_ext.cost',
  },
  {
    id: 'time_efficiency',
    name: '时间效率',
    weight: 0.05,
    description: '路线连贯性、不走回头路、体力分配合理',
    source: '坐标距离计算 + 时段编排',
  },
];

// ===== 评分结果类型 =====

/** 单个景点的多维度评分 */
export interface SpotScore {
  spotId: string;
  spotName: string;
  /** 各维度评分明细 */
  dimensions: AnalysisDimension[];
  /** 加权总分（0-100） */
  totalScore: number;
  /** AI 综合建议（一句话） */
  suggestion: string;
}

/** 整体行程的多维度分析结果 */
export interface TripAnalysis {
  /** 目的地 */
  destination: string;
  /** 行程天数 */
  days: number;
  /** 景点评分列表 */
  spotScores: SpotScore[];
  /** 天气概述 */
  weatherSummary: string;
  /** 交通概述 */
  transportSummary: string;
  /** AI 综合建议 */
  overallSuggestion: string;
  /** 各维度平均得分 */
  dimensionAverages: { id: string; name: string; avgScore: number }[];
  /** 分析时间戳 */
  analyzedAt: string;
}

// ===== 评分工具函数 =====

/**
 * 计算加权总分
 */
export function calculateWeightedScore(dimensions: AnalysisDimension[]): number {
  return dimensions.reduce((sum, d) => sum + (d.score ?? 0) * d.weight, 0);
}

/**
 * 将多个景点按加权总分排序
 */
export function rankSpotsByScore(scores: SpotScore[]): SpotScore[] {
  return [...scores].sort((a, b) => b.totalScore - a.totalScore);
}
