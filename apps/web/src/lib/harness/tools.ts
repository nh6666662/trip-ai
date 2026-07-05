/**
 * Harness Engineering — 各维度分析工具
 *
 * 每个工具函数对应一个分析维度，负责从外部数据源获取原始数据并转换为 0-100 评分。
 * 工具函数相互独立，可并行调用（对应编排层的并行任务拆解）。
 */

import { searchPOI, geocode, type AmapPOI, type SpotFromAmap } from '@/lib/amap';

// ===== 1. 天气适宜度评分 (权重 20%) =====

export interface WeatherData {
  condition: string;   // 晴/多云/小雨/大雨/暴雨/雪
  temperature: number; // 摄氏度
  rainProbability: number; // 0-1
  humidity: number;    // 0-100
  windSpeed: number;   // km/h
}

/**
 * 天气评分 — 根据天气状况评估对户外活动的影响
 * 晴天 90+ / 多云 75+ / 小雨 50 / 大雨 20 / 暴雨雪 10
 */
export function scoreWeather(weather: WeatherData | null): { score: number; reason: string } {
  if (!weather) return { score: 60, reason: '无天气数据，默认中等评分' };

  const { condition, temperature, rainProbability } = weather;

  let score = 80; // 基线

  // 天气状况影响
  if (/晴/.test(condition)) score = 95;
  else if (/多云|阴/.test(condition)) score = 80;
  else if (/小雨|阵雨/.test(condition)) score = 55;
  else if (/中雨|大雨/.test(condition)) score = 30;
  else if (/暴雨|雪|雷/.test(condition)) score = 15;

  // 温度调整（20-28°C 最适宜）
  if (temperature >= 20 && temperature <= 28) score += 5;
  else if (temperature < 5 || temperature > 38) score -= 15;
  else if (temperature < 10 || temperature > 33) score -= 8;

  // 降雨概率调整
  if (rainProbability > 0.7) score -= 10;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reason: `${condition} ${temperature}°C，${score >= 70 ? '适合户外活动' : score >= 40 ? '建议部分室内行程' : '建议以室内景点为主'}`,
  };
}

// ===== 2. 景点质量评分 (权重 20%) =====

/**
 * 景点质量评分 — 基于高德 POI 评分和类型
 */
export function scoreAttractionQuality(poi: AmapPOI | SpotFromAmap): { score: number; reason: string } {
  // 类型兼容：两种类型都可能有 rating
  const rawRating = (poi as any).rating ?? (poi as AmapPOI).biz_ext?.rating ?? '0';
  const rating = typeof rawRating === 'number' ? rawRating : parseFloat(rawRating) || 0;

  let score = rating > 0 ? (rating / 5) * 100 : 50; // 5分制转100分

  // 知名景点加分
  const name = poi.name;
  const desc = (poi as SpotFromAmap).description || '';
  if (/5A|AAAAA|世界遗产|国家级/.test(desc)) score = Math.min(100, score + 10);
  if (/博物馆|故宫|长城|西湖|黄山/.test(name)) score = Math.min(100, score + 5);

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    reason: rating > 0 ? `景点评分 ${rating}/5` : '暂无评分数据',
  };
}

// ===== 3. 人流密度评分 (权重 15%) =====

/**
 * 人流密度评分 — 基于时段规则和景点类型预测
 * 低人流 = 高分，高人流 = 低分
 */
export function scoreCrowdLevel(
  spotName: string,
  visitHour: number,
  isWeekend: boolean,
): { score: number; reason: string } {
  let crowdFactor = 0.5; // 默认中等人流

  // 时段影响（9-11点、14-16点 人流高峰）
  if (visitHour >= 9 && visitHour <= 11) crowdFactor += 0.2;
  else if (visitHour >= 14 && visitHour <= 16) crowdFactor += 0.15;
  else if (visitHour >= 7 && visitHour <= 8) crowdFactor -= 0.2; // 早鸟人少
  else if (visitHour >= 17 && visitHour <= 19) crowdFactor -= 0.1; // 傍晚人少

  // 周末/节假日影响
  if (isWeekend) crowdFactor += 0.2;

  // 热门景点基础人流更高
  if (/故宫|长城|西湖|兵马俑|迪士尼/.test(spotName)) crowdFactor += 0.15;

  crowdFactor = Math.max(0, Math.min(1, crowdFactor));

  // 反转：人流低 → 评分高
  const score = Math.round((1 - crowdFactor) * 100);

  return {
    score,
    reason: crowdFactor > 0.7
      ? `${visitHour}:00 预计人流密集，建议提前或延后`
      : crowdFactor > 0.4
        ? `${visitHour}:00 人流适中`
        : `${visitHour}:00 预计人流较少，体验较好`,
  };
}

// ===== 4. 交通便利性评分 (权重 15%) =====

/**
 * 交通便利性评分 — 基于景点间距离和通勤时间
 */
export function scoreTransport(
  transitMinutes: number,
  distanceKm: number,
): { score: number; reason: string } {
  let score = 90;

  // 通勤时间评分
  if (transitMinutes <= 15) score = 95;
  else if (transitMinutes <= 30) score = 80;
  else if (transitMinutes <= 45) score = 65;
  else if (transitMinutes <= 60) score = 45;
  else score = 25;

  // 距离修正
  if (distanceKm > 30) score -= 15;
  if (distanceKm > 50) score -= 20;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reason: transitMinutes <= 30
      ? `距上一站约 ${transitMinutes} 分钟，交通便利`
      : `距上一站约 ${transitMinutes} 分钟${distanceKm > 20 ? '，路程较远建议预留时间' : ''}`,
  };
}

// ===== 5. 餐饮配套评分 (权重 10%) =====

/**
 * 餐饮配套评分 — 搜索景点周边餐厅数量和质量
 */
export async function scoreDining(
  spotName: string,
  city: string,
): Promise<{ score: number; reason: string }> {
  try {
    const restaurants = await searchPOI('美食', city, '050000', 10);

    if (!restaurants || restaurants.length === 0) {
      return { score: 50, reason: '未找到周边餐饮信息' };
    }

    // 计算平均评分
    const ratings = restaurants
      .map((r) => parseFloat(r.biz_ext?.rating || '0') || 0)
      .filter((r) => r > 0);

    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    const score = avgRating > 0
      ? Math.round((avgRating / 5) * 80 + (restaurants.length >= 5 ? 20 : 10))
      : 50;

    return {
      score: Math.min(100, score),
      reason: `周边找到 ${restaurants.length} 家餐厅${avgRating > 0 ? `，平均评分 ${avgRating.toFixed(1)}/5` : ''}`,
    };
  } catch {
    return { score: 50, reason: '餐饮数据查询失败' };
  }
}

// ===== 6. 偏好匹配度评分 (权重 10%) =====

/** 偏好标签与 POI 类型的映射 */
const PREFERENCE_TYPE_MAP: Record<string, string[]> = {
  '自然风光': ['风景名胜', '公园', '自然保护区', '湖泊'],
  '历史文化': ['博物馆', '古迹', '寺庙', '纪念馆', '文化'],
  '美食': ['餐饮', '美食', '小吃', '餐厅'],
  '亲子': ['游乐园', '动物园', '水族馆', '亲子', '公园'],
  '购物': ['商场', '购物', '步行街', '市场'],
  '休闲': ['公园', '温泉', '咖啡馆', '书店'],
  '摄影': ['风景名胜', '公园', '艺术区', '景点'],
  '夜生活': ['酒吧', 'KTV', '夜市', '夜景'],
};

/**
 * 偏好匹配度评分 — 景点类型与用户偏好的匹配程度
 */
export function scorePreferenceMatch(
  poiType: string,
  preferences: string[],
): { score: number; reason: string } {
  if (!preferences || preferences.length === 0) {
    return { score: 70, reason: '未设置偏好，给予中等评分' };
  }

  let matchCount = 0;
  const matchedPrefs: string[] = [];

  for (const pref of preferences) {
    const keywords = PREFERENCE_TYPE_MAP[pref] || [pref];
    if (keywords.some((kw) => poiType.includes(kw))) {
      matchCount++;
      matchedPrefs.push(pref);
    }
  }

  const matchRatio = matchCount / preferences.length;
  const score = Math.round(matchRatio * 80 + 20); // 基础 20 分 + 匹配加分

  return {
    score: Math.min(100, score),
    reason: matchedPrefs.length > 0
      ? `匹配偏好：${matchedPrefs.join('、')}`
      : `与偏好「${preferences.join('、')}」关联较弱`,
  };
}

// ===== 7. 预算合理性评分 (权重 5%) =====

/**
 * 预算评分 — 基于景点门票和周边消费估算
 */
export function scoreBudget(
  poiCost: string | undefined,
  budgetLevel: 'low' | 'medium' | 'high' = 'medium',
): { score: number; reason: string } {
  const cost = parseFloat(poiCost || '0') || 0;

  if (cost === 0) return { score: 65, reason: '消费数据未知，默认中等' };

  let score = 70;

  if (budgetLevel === 'low') {
    score = cost < 50 ? 90 : cost < 100 ? 70 : cost < 200 ? 50 : 30;
  } else if (budgetLevel === 'high') {
    score = cost > 0 ? 80 : 60; // 高预算不太在意价格
  } else {
    score = cost < 80 ? 85 : cost < 150 ? 70 : cost < 300 ? 55 : 40;
  }

  return {
    score,
    reason: cost > 0 ? `预计人均消费 ¥${cost}` : '消费数据未知',
  };
}

// ===== 8. 时间效率评分 (权重 5%) =====

/**
 * 时间效率评分 — 路线是否连贯、不走回头路
 */
export function scoreTimeEfficiency(
  currentLat: number,
  currentLng: number,
  prevLat: number | null,
  prevLng: number | null,
  nextLat: number | null,
  nextLng: number | null,
): { score: number; reason: string } {
  if (!prevLat || !prevLng) {
    return { score: 80, reason: '行程起点，无效率评估' };
  }

  // 计算与上一站的距离（简化的 Haversine）
  const dist = haversineKm(prevLat, prevLng, currentLat, currentLng);

  let score = 85;

  if (dist < 2) score = 95;       // 很近，步行可达
  else if (dist < 5) score = 85;  // 较近
  else if (dist < 15) score = 70; // 中等距离
  else if (dist < 30) score = 50; // 较远
  else score = 30;                 // 很远

  // 检查是否走回头路
  if (nextLat && nextLng) {
    const backDist = haversineKm(currentLat, currentLng, nextLat, nextLng);
    const skipDist = haversineKm(prevLat, prevLng, nextLat, nextLng);
    if (backDist + dist > skipDist * 1.5) {
      score -= 15;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reason: `距上一站 ${dist.toFixed(1)}km${score < 50 ? '，距离较远建议调整顺序' : ''}`,
  };
}

// ===== 内部工具 =====

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
