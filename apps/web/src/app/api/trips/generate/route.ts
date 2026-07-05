import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";
import { createStrategy } from "@/lib/trip/strategy";
import { searchForTrip } from "@/lib/amap";
import { getWeatherForecast } from "@/lib/weather";
import { forecastToWeatherData } from "@/lib/weather/adapter";
import { runHarnessAnalysis, type HarnessConfig } from "@/lib/harness";
import type { GenerateTripRequest } from "@/types/api";
import type { Spot, TripNodeInsert } from "@/types/database";

/**
 * POST /api/trips/generate — AI 生成行程（Harness Engineering 多维度分析）
 *
 * 工作流程：
 * 1. 召回景点（高德 POI → Supabase → 兜底数据）
 * 2. Harness Engine 多维度分析（8 维度加权评分）
 * 3. 策略模式排程（紧凑/松弛）
 * 4. 持久化行程 + 节点
 * 5. 返回行程 + 分析报告
 */
export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = (await req.json()) as GenerateTripRequest;
  if (!body.destination || !body.start_date || !body.end_date) {
    return errorResponse("目的地、起止日期不能为空", 400);
  }

  let spots: Spot[] = [];

  // ===== 优先级 1：高德地图 POI 搜索（真实数据）=====
  try {
    const amapSpots = await searchForTrip(
      body.destination,
      body.preferences ?? [],
    );
    if (amapSpots.length > 0) {
      spots = amapSpots;
      console.log(`[Generate] 高德 POI 搜索返回 ${spots.length} 个景点`);
    }
  } catch (e) {
    console.warn("[Generate] 高德 POI 搜索失败，降级到本地数据:", e);
  }

  // ===== 优先级 2：Supabase spots 表（种子数据）=====
  if (spots.length === 0) {
    const { data: dbSpots } = await supabase
      .from("spots")
      .select("*")
      .ilike("name", `%${body.destination}%`)
      .limit(12);

    if (dbSpots && dbSpots.length > 0) {
      spots = dbSpots;
      console.log(`[Generate] Supabase 种子数据返回 ${spots.length} 个景点`);
    }
  }

  // ===== 优先级 2b：Supabase 全量兜底 =====
  if (spots.length === 0) {
    const { data: fallback } = await supabase
      .from("spots")
      .select("*")
      .limit(8);
    if (fallback && fallback.length > 0) {
      spots = fallback;
      console.log(`[Generate] Supabase 全量兜底返回 ${spots.length} 个景点`);
    }
  }

  // ===== 优先级 3：内置示例景点（最终兜底）=====
  if (spots.length === 0) {
    spots = sampleSpots(body.destination);
    console.log(`[Generate] 使用内置示例景点 ${spots.length} 个`);
  }

  // ===== 查询目的地天气数据（为 Harness 天气维度注入真实数据）=====
  let weatherData: import("@/lib/harness/tools").WeatherData | null = null;
  try {
    const forecasts = await getWeatherForecast(body.destination);
    if (forecasts.length > 0) {
      weatherData = forecastToWeatherData(forecasts[0]);
      console.log(`[Generate] 天气数据: ${weatherData.condition} ${weatherData.temperature}°C`);
    }
  } catch (e) {
    console.warn("[Generate] 天气查询失败，使用默认评分:", e);
  }

  // ===== Harness Engine 多维度分析 =====
  const harnessConfig: HarnessConfig = {
    destination: body.destination,
    departure: body.departure,
    startDate: body.start_date,
    endDate: body.end_date,
    pace: body.pace,
    preferences: body.preferences ?? [],
    budgetLevel: "medium",
    travelerCount: body.traveler_count ?? 1,
    weatherData,
    preloadedSpots: spots as any, // 传入已获取的景点数据，避免 Harness 内部重复调用高德 API
  };

  // ===== Harness Engine 多维度分析 =====
  let analysisResult = null;
  try {
    analysisResult = await runHarnessAnalysis(harnessConfig);
    console.log(`[Generate] Harness 分析完成，${analysisResult.spotScores.length} 个景点评分`);
  } catch (e) {
    console.warn("[Generate] Harness 分析失败，使用原始景点顺序:", e);
  }

  // 使用 Harness 排序后的景点（按加权总分从高到低）
  let sortedSpots = spots;
  if (analysisResult?.spotScores?.length) {
    const rankedIds = new Set(analysisResult.spotScores.map((s: { spotId: string }) => s.spotId));
    const ranked = analysisResult.spotScores
      .map((s: { spotId: string }) => spots.find((sp) => sp.id === s.spotId))
      .filter(Boolean) as Spot[];
    // 追加未被评分的景点到末尾
    const unranked = spots.filter((sp) => !rankedIds.has(sp.id));
    sortedSpots = [...ranked, ...unranked];
  }

  const strategy = createStrategy(body.pace);
  const { nodes } = strategy.generate({
    spots: sortedSpots,
    pace: body.pace,
    startDate: body.start_date,
    endDate: body.end_date,
    destination: body.destination,
  });

  // 持久化行程
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .insert({
      user_id: user!.id,
      destination: body.destination,
      departure: body.departure ?? null,
      start_date: body.start_date,
      end_date: body.end_date,
      pace: body.pace,
      traveler_count: body.traveler_count ?? 1,
      preferences: body.preferences ?? null,
      status: "draft",
    })
    .select()
    .single();

  if (tripErr) return errorResponse(tripErr.message, 400);

  // 持久化节点
  const nodesToInsert: TripNodeInsert[] = nodes.map((n) => ({
    ...n,
    trip_id: trip!.id,
  }));

  const { data: insertedNodes, error: nodesErr } = await supabase
    .from("trip_nodes")
    .insert(nodesToInsert)
    .select();

  if (nodesErr) return errorResponse(nodesErr.message, 400);

  return NextResponse.json({
    trip,
    nodes: insertedNodes ?? [],
    // Harness Engineering 多维度分析报告
    analysis: analysisResult ?? undefined,
  });
}

/** 兜底示例景点（景点库为空时使用，保证 AI 生成可用） */
function sampleSpots(destination: string) {
  const base = [
    {
      name: `${destination}博物馆`,
      rating: 4.6,
      recommended_minutes: 120,
      min_visit_minutes: 90,
    },
    {
      name: `${destination}西湖风景区`,
      rating: 4.8,
      recommended_minutes: 180,
      min_visit_minutes: 120,
    },
    {
      name: `${destination}老街`,
      rating: 4.4,
      recommended_minutes: 90,
      min_visit_minutes: 60,
    },
    {
      name: `${destination}植物园`,
      rating: 4.3,
      recommended_minutes: 90,
      min_visit_minutes: 60,
    },
    {
      name: `${destination}夜景观景台`,
      rating: 4.5,
      recommended_minutes: 60,
      min_visit_minutes: 45,
    },
    {
      name: `${destination}美食街`,
      rating: 4.7,
      recommended_minutes: 90,
      min_visit_minutes: 60,
    },
  ];
  return base.map((s, i) => ({
    id: `sample-${i}`,
    name: s.name,
    description: null,
    image_url: null,
    latitude: 30.25 + i * 0.01,
    longitude: 120.16 + i * 0.01,
    min_visit_minutes: s.min_visit_minutes,
    recommended_minutes: s.recommended_minutes,
    rating: s.rating,
    tags: ["必去"],
    opening_time: "08:00",
    closing_time: "18:00",
  }));
}
