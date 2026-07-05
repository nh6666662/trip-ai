/**
 * 高德地图 Web Service API 工具模块
 * 对应《项目总纲.md》5.4 第三方服务 — 高德地图 API
 *
 * 使用 v3 REST API（服务端调用），Key 从环境变量 NEXT_PUBLIC_AMAP_KEY 读取。
 * 所有请求携带 appname=trip-ai 标识。
 */

const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || '';
const AMAP_BASE = 'https://restapi.amap.com';
const APP_NAME = 'trip-ai';

// ===== 类型定义 =====

export interface AmapPOI {
  id: string;
  name: string;
  type: string;
  address: string;
  location: string; // "lng,lat"
  tel: string;
  biz_ext: {
    rating?: string;
    cost?: string;
  };
  photos: { title: string; url: string }[];
  cityname: string;
  adname: string;
}

export interface AmapGeocodeResult {
  formatted_address: string;
  city: string;
  district: string;
  location: string; // "lng,lat"
  level: string;
}

export interface SpotFromAmap {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  min_visit_minutes: number;
  recommended_minutes: number;
  rating: number;
  tags: string[];
  opening_time: string | null;
  closing_time: string | null;
}

// ===== API 调用 =====

/**
 * POI 关键词搜索 — 根据目的地城市搜索景点/餐厅/酒店
 * @param keywords 搜索关键词（如 "景点"、"美食"、"博物馆"）
 * @param city 城市名称（如 "杭州"、"北京"）
 * @param types POI 类型编码（可选，如 "110000" 景点）
 * @param pageSize 每页数量（最大 25）
 */
export async function searchPOI(
  keywords: string,
  city: string,
  types?: string,
  pageSize = 20,
): Promise<AmapPOI[]> {
  if (!AMAP_KEY) {
    console.warn('[Amap] NEXT_PUBLIC_AMAP_KEY 未配置，跳过 POI 搜索');
    return [];
  }

  const params = new URLSearchParams({
    keywords,
    city,
    key: AMAP_KEY,
    output: 'json',
    offset: String(Math.min(pageSize, 25)),
    page: '1',
    appname: APP_NAME,
  });
  if (types) params.set('types', types);

  const url = `${AMAP_BASE}/v3/place/text?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // 缓存 1 小时
  const data = await res.json();

  if (data.status !== '1' || !data.pois) {
    console.warn('[Amap] POI 搜索失败:', data.info, data.infocode);
    return [];
  }

  return data.pois as AmapPOI[];
}

/**
 * 地理编码 — 将地址/地名转换为经纬度坐标
 * @param address 地址或地名（如 "杭州西湖"、"北京市天安门"）
 */
export async function geocode(address: string): Promise<AmapGeocodeResult | null> {
  if (!AMAP_KEY) {
    console.warn('[Amap] NEXT_PUBLIC_AMAP_KEY 未配置，跳过地理编码');
    return null;
  }

  const params = new URLSearchParams({
    address,
    key: AMAP_KEY,
    output: 'json',
    appname: APP_NAME,
  });

  const url = `${AMAP_BASE}/v3/geocode/geo?${params.toString()}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();

  if (data.status !== '1' || !data.geocodes?.length) {
    console.warn('[Amap] 地理编码失败:', data.info);
    return null;
  }

  return data.geocodes[0] as AmapGeocodeResult;
}

/**
 * 多类型 POI 聚合搜索 — 为行程规划搜索景点 + 美食
 * @param destination 目的地城市
 * @param preferences 用户偏好标签（如 ["自然风光", "美食"]）
 * @param maxPerType 每种类型最多返回数量
 */
export async function searchForTrip(
  destination: string,
  preferences: string[] = [],
  maxPerType = 8,
): Promise<SpotFromAmap[]> {
  // 根据偏好映射搜索类别
  const categories: { keyword: string; types?: string }[] = [];

  // 景点始终搜索
  categories.push({ keyword: '景点', types: '110000' });

  // 根据偏好追加类别
  if (preferences.some((p) => /美食|餐饮|小吃/.test(p))) {
    categories.push({ keyword: '美食', types: '050000' });
  }
  if (preferences.some((p) => /购物|商场/.test(p))) {
    categories.push({ keyword: '购物', types: '060000' });
  }
  if (preferences.some((p) => /亲子|儿童/.test(p))) {
    categories.push({ keyword: '亲子游乐', types: '110000|141200' });
  }

  // 无特殊偏好时默认追加美食
  if (categories.length === 1) {
    categories.push({ keyword: '美食', types: '050000' });
  }

  // 并行搜索所有类别
  const results = await Promise.all(
    categories.map((cat) => searchPOI(cat.keyword, destination, cat.types, maxPerType)),
  );

  // 合并去重（按 POI id）
  const seen = new Set<string>();
  const allPois: AmapPOI[] = [];
  for (const pois of results) {
    for (const poi of pois) {
      if (!seen.has(poi.id)) {
        seen.add(poi.id);
        allPois.push(poi);
      }
    }
  }

  // 转换为 SpotFromAmap 格式（与数据库 spots 表结构对齐）
  return allPois.map((poi) => poiToSpot(poi));
}

/** 将高德 POI 转换为项目 Spot 格式 */
function poiToSpot(poi: AmapPOI): SpotFromAmap {
  const [lng, lat] = poi.location.split(',').map(Number);
  const rating = parseFloat(poi.biz_ext?.rating || '0') || 0;

  // 根据类型估算游览时间
  const isScenic = poi.type?.includes('风景名胜') || poi.type?.includes('旅游景点');
  const isRestaurant = poi.type?.includes('餐饮');
  const isShopping = poi.type?.includes('购物');

  let recommended = 120;
  let minimum = 60;
  if (isScenic) { recommended = 150; minimum = 90; }
  if (isRestaurant) { recommended = 90; minimum = 60; }
  if (isShopping) { recommended = 90; minimum = 45; }

  // 提取标签
  const tags: string[] = [];
  if (poi.type) {
    const mainType = poi.type.split(';')[0]?.split('|')[0];
    if (mainType) tags.push(mainType);
  }
  if (rating >= 4.5) tags.push('高评分');

  return {
    id: poi.id,
    name: poi.name,
    description: poi.address || null,
    image_url: poi.photos?.[0]?.url || null,
    latitude: lat,
    longitude: lng,
    min_visit_minutes: minimum,
    recommended_minutes: recommended,
    rating,
    tags,
    opening_time: null,
    closing_time: null,
  };
}
