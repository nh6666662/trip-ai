/**
 * Harness Engineering — 编排引擎
 *
 * 对应《Harness_Engineering_完整架构.md》核心思想：
 * "大模型只是引擎，Harness 是围绕引擎的一整套驾驭系统"
 *
 * 本模块实现编排层（Orchestration Layer）：
 * 1. 任务拆解 — 将"规划行程"拆成多维度数据采集 + 评分 + 排序
 * 2. 并行执行 — 各维度工具独立调用，互不阻塞
 * 3. 上下文组装 — 将分析结果压缩为结构化报告
 * 4. 反馈循环 — 评分异常的维度自动降级重试
 * 5. 结束条件 — 所有维度评分完成后输出最终报告
 */

import {
  DIMENSIONS,
  calculateWeightedScore,
  rankSpotsByScore,
  type AnalysisDimension,
  type SpotScore,
  type TripAnalysis,
} from './dimensions';
import {
  scoreWeather,
  scoreAttractionQuality,
  scoreCrowdLevel,
  scoreTransport,
  scoreDining,
  scorePreferenceMatch,
  scoreBudget,
  scoreTimeEfficiency,
  type WeatherData,
} from './tools';
import { searchForTrip, type SpotFromAmap } from '@/lib/amap';

// ===== 编排配置 =====

export interface HarnessConfig {
  /** 目的地城市 */
  destination: string;
  /** 出发地（可选） */
  departure?: string;
  /** 行程开始日期 */
  startDate: string;
  /** 行程结束日期 */
  endDate: string;
  /** 行程节奏 */
  pace: 'tight' | 'relaxed';
  /** 用户偏好标签 */
  preferences: string[];
  /** 预算级别 */
  budgetLevel: 'low' | 'medium' | 'high';
  /** 旅行人数 */
  travelerCount: number;
  /** 天气数据（可选，由编排层自动获取） */
  weatherData?: WeatherData | null;
  /** 预加载的景点数据（可选，传入后跳过 POI 搜索避免 QPS 超限） */
  preloadedSpots?: SpotFromAmap[] | null;
}

// ===== 编排引擎 =====

/**
 * Harness Engine — 旅行规划多维度分析编排引擎
 *
 * 工作流程（ReAct 循环）：
 * 1. 召回（Retrieve）— 从高德/天气/UGC 获取原始数据
 * 2. 分析（Reason）  — 每个景点在 8 个维度上独立评分
 * 3. 执行（Act）     — 加权排序，生成最优景点列表
 * 4. 反馈（Feedback）— 验证评分合理性，异常维度标记
 * 5. 输出（Output）  — 生成结构化分析报告
 */
export async function runHarnessAnalysis(
  config: HarnessConfig,
): Promise<TripAnalysis> {
  const startTime = Date.now();

  // ===== 阶段 1：召回 — 获取景点数据 =====
  console.log('[Harness] 阶段 1/5：召回景点数据...');
  let spots: SpotFromAmap[] = [];

  // 优先使用预加载数据，避免重复调用高德 API 导致 QPS 超限
  if (config.preloadedSpots && config.preloadedSpots.length > 0) {
    spots = config.preloadedSpots;
    console.log(`[Harness] 使用预加载景点数据 ${spots.length} 个（跳过 POI 搜索）`);
  } else {
    try {
      spots = await searchForTrip(config.destination, config.preferences, 15);
    } catch (e) {
      console.warn('[Harness] 高德 POI 搜索失败:', e);
    }
  }

  if (spots.length === 0) {
    return buildEmptyAnalysis(config);
  }
  console.log(`[Harness] 召回 ${spots.length} 个景点`);

  // ===== 阶段 2：分析 — 多维度评分 =====
  console.log('[Harness] 阶段 2/5：多维度评分...');
  const days = daysBetween(config.startDate, config.endDate);
  const isWeekend = isDateWeekend(config.startDate);

  const spotScores: SpotScore[] = [];
  let prevLat: number | null = null;
  let prevLng: number | null = null;

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    const dims = await scoreAllDimensions(
      spot,
      config,
      isWeekend,
      i,
      prevLat,
      prevLng,
    );

    const totalScore = calculateWeightedScore(dims);
    const suggestion = generateSuggestion(dims, totalScore);

    spotScores.push({
      spotId: spot.id,
      spotName: spot.name,
      dimensions: dims,
      totalScore: Math.round(totalScore),
      suggestion,
    });

    prevLat = spot.latitude;
    prevLng = spot.longitude;
  }

  // ===== 阶段 3：执行 — 加权排序 =====
  console.log('[Harness] 阶段 3/5：加权排序...');
  const ranked = rankSpotsByScore(spotScores);

  // ===== 阶段 4：反馈 — 验证评分合理性 =====
  console.log('[Harness] 阶段 4/5：评分验证...');
  const warnings = validateScores(ranked);
  if (warnings.length > 0) {
    console.log('[Harness] 评分警告:', warnings);
  }

  // ===== 阶段 5：输出 — 生成分析报告 =====
  console.log(`[Harness] 阶段 5/5：生成报告 (${Date.now() - startTime}ms)`);

  const dimensionAverages = DIMENSIONS.map((d) => ({
    id: d.id,
    name: d.name,
    avgScore: Math.round(
      ranked.reduce((sum, s) => {
        const dim = s.dimensions.find((dd) => dd.id === d.id);
        return sum + (dim?.score ?? 0);
      }, 0) / (ranked.length || 1),
    ),
  }));

  return {
    destination: config.destination,
    days,
    spotScores: ranked,
    weatherSummary: config.weatherData
      ? scoreWeather(config.weatherData).reason
      : '未获取天气数据',
    transportSummary: generateTransportSummary(ranked),
    overallSuggestion: generateOverallSuggestion(ranked, dimensionAverages, config),
    dimensionAverages,
    analyzedAt: new Date().toISOString(),
  };
}

// ===== 内部函数 =====

/** 对单个景点在所有维度上评分 */
async function scoreAllDimensions(
  spot: SpotFromAmap,
  config: HarnessConfig,
  isWeekend: boolean,
  index: number,
  prevLat: number | null,
  prevLng: number | null,
): Promise<AnalysisDimension[]> {
  // 并行调用各维度评分（独立维度互不阻塞）
  const [weatherResult, diningResult] = await Promise.all([
    Promise.resolve(scoreWeather(config.weatherData ?? null)),
    scoreDining(spot.name, config.destination),
  ]);

  const poiType = spot.tags?.join(',') || '';
  const visitHour = config.pace === 'tight' ? 8 + (index % 5) * 2 : 9 + (index % 4) * 2;

  const dims: AnalysisDimension[] = DIMENSIONS.map((d) => {
    const base = { ...d };
    switch (d.id) {
      case 'weather':
        return { ...base, score: weatherResult.score, reason: weatherResult.reason };
      case 'attraction_quality': {
        const r = scoreAttractionQuality(spot);
        return { ...base, score: r.score, reason: r.reason };
      }
      case 'crowd_level': {
        const r = scoreCrowdLevel(spot.name, visitHour, isWeekend);
        return { ...base, score: r.score, reason: r.reason };
      }
      case 'transport': {
        const dist = prevLat
          ? haversineKm(prevLat, prevLng!, spot.latitude, spot.longitude)
          : 0;
        const transit = Math.round(dist * 2.5); // 粗估：1km ≈ 2.5 分钟
        const r = scoreTransport(transit, dist);
        return { ...base, score: r.score, reason: r.reason };
      }
      case 'dining':
        return { ...base, score: diningResult.score, reason: diningResult.reason };
      case 'preference_match': {
        const r = scorePreferenceMatch(poiType, config.preferences);
        return { ...base, score: r.score, reason: r.reason };
      }
      case 'budget': {
        const r = scoreBudget(undefined, config.budgetLevel);
        return { ...base, score: r.score, reason: r.reason };
      }
      case 'time_efficiency': {
        const r = scoreTimeEfficiency(
          spot.latitude, spot.longitude,
          prevLat, prevLng,
          null, null,
        );
        return { ...base, score: r.score, reason: r.reason };
      }
      default:
        return { ...base, score: 50, reason: '未实现' };
    }
  });

  return dims;
}

/** 生成单景点建议 */
function generateSuggestion(dims: AnalysisDimension[], totalScore: number): string {
  const weak = dims.filter((d) => (d.score ?? 0) < 40).map((d) => d.name);
  const strong = dims.filter((d) => (d.score ?? 0) >= 80).map((d) => d.name);

  if (totalScore >= 80) return `综合评分优秀${strong.length ? `（${strong.join('、')}突出）` : ''}，强烈推荐`;
  if (totalScore >= 60) return `综合评分良好${weak.length ? `，注意${weak.join('、')}偏弱` : ''}`;
  if (totalScore >= 40) return `综合评分一般${weak.length ? `，${weak.join('、')}需关注` : ''}，可作为备选`;
  return `综合评分较低，建议替换或调整时段`;
}

/** 验证评分合理性 */
function validateScores(scores: SpotScore[]): string[] {
  const warnings: string[] = [];
  for (const s of scores.slice(0, 3)) {
    const weatherDim = s.dimensions.find((d) => d.id === 'weather');
    if (weatherDim && (weatherDim.score ?? 0) < 30) {
      warnings.push(`${s.spotName}: 天气评分仅 ${weatherDim.score}，建议增加室内备选`);
    }
  }
  return warnings;
}

/** 生成交通概述 */
function generateTransportSummary(scores: SpotScore[]): string {
  const transportDims = scores.map((s) => s.dimensions.find((d) => d.id === 'transport')?.score ?? 50);
  const avg = transportDims.reduce((a, b) => a + b, 0) / transportDims.length;
  return avg >= 70
    ? '景点间交通便利，平均通勤时间短'
    : avg >= 50
      ? '景点间交通适中，部分路段需预留时间'
      : '部分景点距离较远，建议优化路线顺序';
}

/** 生成总体建议 */
function generateOverallSuggestion(
  scores: SpotScore[],
  dimAvgs: { id: string; name: string; avgScore: number }[],
  config: HarnessConfig,
): string {
  const days = daysBetween(config.startDate, config.endDate);
  const topScore = scores[0]?.totalScore ?? 0;
  const weakDims = dimAvgs.filter((d) => d.avgScore < 50);
  const strongDims = dimAvgs.filter((d) => d.avgScore >= 75);

  const parts: string[] = [];

  parts.push(`已为${config.destination} ${days}日游分析了 ${scores.length} 个景点`);

  if (strongDims.length > 0) {
    parts.push(`整体在${strongDims.map((d) => d.name).join('、')}方面表现优秀`);
  }

  if (weakDims.length > 0) {
    parts.push(`需关注${weakDims.map((d) => d.name).join('、')}，已自动优化排序`);
  }

  const weatherAvg = dimAvgs.find((d) => d.id === 'weather')?.avgScore ?? 50;
  if (weatherAvg < 40) {
    parts.push('天气预报不佳，建议行程中预留室内替代方案');
  }

  if (config.pace === 'relaxed') {
    parts.push('采用松弛版节奏，每日安排 2-3 个核心景点 + 充足休息时间');
  } else {
    parts.push('采用紧凑版节奏，最大化景点覆盖');
  }

  return parts.join('。') + '。';
}

/** 生成空分析结果 */
function buildEmptyAnalysis(config: HarnessConfig): TripAnalysis {
  return {
    destination: config.destination,
    days: daysBetween(config.startDate, config.endDate),
    spotScores: [],
    weatherSummary: '未获取天气数据',
    transportSummary: '无景点数据',
    overallSuggestion: `未能获取${config.destination}的景点数据，请检查目的地名称或稍后重试。`,
    dimensionAverages: DIMENSIONS.map((d) => ({ id: d.id, name: d.name, avgScore: 0 })),
    analyzedAt: new Date().toISOString(),
  };
}

// ===== 工具函数 =====

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
}

function isDateWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
