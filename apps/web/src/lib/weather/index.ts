/**
 * 和风天气 API 客户端
 * 文档：https://dev.qweather.com/docs/api/weather/
 *
 * 三个核心接口：
 * - getWeatherForecast: 7 天预报（行程生成时查询）
 * - getWeatherNow: 实时天气（行程中展示）
 * - getWeatherWarnings: 灾害预警（暴雨/高温/大风）
 */

const QWEATHER_KEY = process.env.QWEATHER_API_KEY || '';
const QWEATHER_HOST = process.env.QWEATHER_HOST || 'py2tuqtv4v.re.qweatherapi.com';
const QWEATHER_BASE = `https://${QWEATHER_HOST}`;

export interface QWeatherForecast {
  fxDate: string;
  tempMax: string;
  tempMin: string;
  textDay: string;
  textNight: string;
  iconDay: string;
  windSpeedDay: string;
  humidity: string;
  uvIndex: string;
}

export interface QWeatherNow {
  temp: string;
  text: string;
  icon: string;
  humidity: string;
  windSpeed: string;
  windDir: string;
  pressure: string;
  visibility: string;
  cloud: string;
  dew: string;
}

export interface QWeatherWarning {
  id: string;
  title: string;
  level: string;
  type: string;
  text: string;
  startTime: string;
  endTime: string;
}

/** 天气图标代码 → emoji 映射（和风天气 icon 代码表） */
const ICON_EMOJI_MAP: Record<string, string> = {
  '100': '☀️', '101': '🌤️', '102': '⛅', '103': '🌥️', '104': '☁️',
  '150': '🌙', '151': '🌙', '152': '🌙', '153': '🌙',
  '300': '🌧️', '301': '🌧️', '302': '⛈️', '303': '⛈️', '304': '🌨️',
  '305': '小雨', '306': '中雨', '307': '大雨', '308': '暴雨',
  '309': '细雨', '310': '暴雨', '311': '大暴雨', '312': '特大暴雨',
  '313': '冻雨', '314': '小雪', '315': '中雪', '316': '大雪',
  '317': '暴雪', '318': '暴雪', '399': '雨夹雪',
  '400': '❄️', '401': '❄️', '402': '❄️', '403': '❄️', '404': '🌨️',
  '405': '🌨️', '406': '🌨️', '407': '🌨️', '408': '🌨️', '409': '🌨️',
  '410': '🌨️', '499': '🌨️',
  '500': '🌫️', '501': '🌫️', '502': '霾', '503': '扬沙', '504': '沙尘暴',
  '507': '沙尘暴', '508': '强沙尘暴', '509': '浓雾', '510': '强浓雾',
  '511': '中度霾', '512': '重度霾', '513': '严重霾', '514': '大雾', '515': '特强浓雾',
  '900': '🔥', '901': '❄️', '999': '未知',
};

/** 将和风天气 icon 代码转为 emoji */
export function iconToEmoji(icon: string): string {
  return ICON_EMOJI_MAP[icon] ?? '🌤️';
}

/**
 * 获取城市 7 天天气预报
 * @param location 城市名或经纬度（"116.41,39.92"）
 */
export async function getWeatherForecast(
  location: string,
): Promise<QWeatherForecast[]> {
  if (!QWEATHER_KEY) {
    console.warn('[Weather] QWEATHER_API_KEY 未配置');
    return [];
  }

  const locationId = await resolveLocationId(location);
  if (!locationId) return [];

  const url = `${QWEATHER_BASE}/v7/weather/7d?location=${locationId}&key=${QWEATHER_KEY}&lang=zh`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();

  if (data.code !== '200') {
    console.warn('[Weather] 预报查询失败:', data.code);
    return [];
  }

  return data.daily ?? [];
}

/**
 * 获取实时天气
 */
export async function getWeatherNow(location: string): Promise<QWeatherNow | null> {
  if (!QWEATHER_KEY) return null;
  const locationId = await resolveLocationId(location);
  if (!locationId) return null;

  const url = `${QWEATHER_BASE}/v7/weather/now?location=${locationId}&key=${QWEATHER_KEY}&lang=zh`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const data = await res.json();

  return data.code === '200' ? data.now : null;
}

/**
 * 获取灾害预警
 */
export async function getWeatherWarnings(location: string): Promise<QWeatherWarning[]> {
  if (!QWEATHER_KEY) return [];
  const locationId = await resolveLocationId(location);
  if (!locationId) return [];

  const url = `${QWEATHER_BASE}/v7/warning/now?location=${locationId}&key=${QWEATHER_KEY}&lang=zh`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  const data = await res.json();

  return data.code === '200' ? (data.warning ?? []) : [];
}

/**
 * 获取空气质量数据
 */
export async function getAirQuality(location: string): Promise<{
  aqi: string;
  category: string;
  pm25: string;
  pm10: string;
} | null> {
  if (!QWEATHER_KEY) return null;
  const locationId = await resolveLocationId(location);
  if (!locationId) return null;

  const url = `${QWEATHER_BASE}/v7/air/now?location=${locationId}&key=${QWEATHER_KEY}&lang=zh`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  const data = await res.json();

  return data.code === '200' ? data.now : null;
}

/** 城市名/行政编码 → LocationID（和风天气内部编码）
 *  注意：和风天气仅支持城市 ID 查询，不支持直接使用经纬度或行政编码 */
async function resolveLocationId(location: string): Promise<string | null> {
  // 如果已经是纯数字城市 ID（如 101010100），直接返回
  if (/^\d{6,9}$/.test(location)) {
    return location;
  }

  const geoUrl = `${QWEATHER_BASE}/geo/v2/city/lookup?location=${encodeURIComponent(location)}&key=${QWEATHER_KEY}&number=1`;
  const res = await fetch(geoUrl, { next: { revalidate: 86400 } });
  const data = await res.json();
  return data.code === '200' && data.location?.[0]
    ? data.location[0].id
    : null;
}

/** 天气是否可用 */
export function isWeatherConfigured(): boolean {
  return !!QWEATHER_KEY;
}
