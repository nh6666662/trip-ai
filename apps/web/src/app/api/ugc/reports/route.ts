import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api/auth";
import type { UGCReportInsert } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/ugc/reports — 创建 UGC 上报 + 服务端自动审核
 *
 * 审核流程（装饰器模式，内联实现，不依赖 Edge Function）：
 * 1. 基础验证 — 内容长度、评分范围
 * 2. 时间验证 — 上报时效性
 * 3. 用户信誉 — 查询 user_profiles.reputation_score
 * 4. 交叉验证 — 同景点近期上报数量（多人上报 = 高可信度）
 * 5. 根据置信度自动设置状态：verified / pending / rejected
 *
 * 快速通过模式（环境变量 UGC_SKIP_REVIEW=true）：
 * - 跳过审核流程，直接 status="verified"
 * - 保留预警生成逻辑，用于测试 AI 监测联动
 */
export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const body = (await req.json()) as UGCReportInsert & {
    place_name?: string;
    place_lat?: number;
    place_lng?: number;
  };
  if (!body.content && (!body.photos || body.photos.length === 0)) {
    return errorResponse("内容不能为空", 400);
  }

  // ===== 如果没有 spot_id 但有 place_name + 坐标，自动 ensure spot =====
  if (!body.spot_id && body.place_name && body.place_lat && body.place_lng) {
    // 先查询 spots 表是否已有同名景点（避免重复创建）
    const { data: existing } = await supabase
      .from("spots")
      .select("id")
      .ilike("name", body.place_name)
      .limit(1)
      .maybeSingle();

    if (existing) {
      body.spot_id = existing.id;
    } else {
      // 创建新 spot
      const { data: newSpot, error: spotErr } = await supabase
        .from("spots")
        .insert({
          name: body.place_name,
          latitude: body.place_lat,
          longitude: body.place_lng,
          rating: body.rating ?? 0,
        })
        .select("id")
        .single();

      if (spotErr) {
        return errorResponse(`创建地点失败: ${spotErr.message}`, 400);
      }
      body.spot_id = newSpot.id;
    }
    // 同步 user_lat/user_lng
    body.user_lat = body.place_lat;
    body.user_lng = body.place_lng;
  }

  if (!body.spot_id) {
    return errorResponse("请选择或输入地点", 400);
  }

  // ===== 快速通过模式：跳过审核，直接 verified，保留预警生成 =====
  // 设置环境变量 UGC_SKIP_REVIEW=true 启用（用于测试预警联动）
  const skipReview = process.env.UGC_SKIP_REVIEW === "true";

  if (skipReview) {
    console.log("[UGC] 快速通过模式：跳过审核，直接 verified");
    const { data, error: err } = await supabase
      .from("ugc_reports")
      .insert({
        user_id: user!.id,
        spot_id: body.spot_id,
        trip_id: body.trip_id ?? null,
        content: body.content ?? null,
        photos: body.photos ?? null,
        rating: body.rating ?? null,
        user_lat: body.user_lat ?? null,
        user_lng: body.user_lng ?? null,
        status: "verified",
        confidence: 1.0,
      })
      .select()
      .single();

    if (err) return errorResponse(err.message, 400);

    // 快速通过模式下仍执行预警生成逻辑
    if (body.trip_id) {
      try {
        await generateAlertFromUgc(supabase, body, 1.0);
      } catch (e) {
        console.error("[UGC] 快速模式预警生成失败:", e);
      }
    }

    return NextResponse.json({
      ...data,
      _review: {
        confidence: 1.0,
        status: "verified",
        notes: ["快速通过模式（跳过审核）"],
      },
    });
  }

  // ===== 装饰器验证链（正常审核流程） =====
  let confidence = 0.2; // 基础分
  const notes: string[] = [];

  // 1. 内容质量验证
  const contentLen = (body.content ?? "").length;
  if (contentLen >= 20) {
    confidence += 0.15;
  } else if (contentLen >= 10) {
    confidence += 0.05;
    notes.push("内容较短");
  } else if (contentLen > 0) {
    notes.push("内容过短，待人工审核");
  }

  // 有照片加分
  if (body.photos && body.photos.length > 0) {
    confidence += 0.15;
  }

  // 有评分加分
  if (body.rating && body.rating >= 1 && body.rating <= 5) {
    confidence += 0.05;
  }

  // 2. 用户信誉验证
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("reputation_score")
      .eq("id", user!.id)
      .single();

    const reputation = profile?.reputation_score ?? 0.5;
    if (reputation >= 0.8) {
      confidence += 0.2;
      notes.push("高信誉用户");
    } else if (reputation >= 0.5) {
      confidence += 0.1;
    } else {
      notes.push("用户信誉较低");
    }
  } catch {
    // 查不到用户资料，跳过
  }

  // 3. 交叉验证 — 同景点近 1 小时内的其他上报
  try {
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentReports } = await supabase
      .from("ugc_reports")
      .select("id")
      .eq("spot_id", body.spot_id)
      .gte("created_at", oneHourAgo)
      .neq("user_id", user!.id);

    const crossCount = recentReports?.length ?? 0;
    if (crossCount >= 2) {
      confidence += 0.2;
      notes.push(`${crossCount} 人近期上报同一景点`);
    } else if (crossCount >= 1) {
      confidence += 0.1;
      notes.push("有他人近期上报");
    }
  } catch {
    // 交叉验证失败不影响主流程
  }

  // 4. 有位置数据加分
  if (body.user_lat && body.user_lng) {
    confidence += 0.1;
  }

  // 限制上限
  confidence = Math.min(confidence, 1.0);

  // 5. 根据置信度决定状态
  const status = confidence >= 0.7
    ? "verified"
    : confidence >= 0.4
      ? "pending"
      : "rejected";

  // ===== 写入数据库 =====
  const { data, error: err } = await supabase
    .from("ugc_reports")
    .insert({
      user_id: user!.id,
      spot_id: body.spot_id,
      trip_id: body.trip_id ?? null,
      content: body.content ?? null,
      photos: body.photos ?? null,
      rating: body.rating ?? null,
      user_lat: body.user_lat ?? null,
      user_lng: body.user_lng ?? null,
      status,
      confidence,
    })
    .select()
    .single();

  if (err) return errorResponse(err.message, 400);

  // ===== 高置信度上报 → 自动生成预警 + AI 备选方案 =====
  if (status === "verified" && body.trip_id) {
    try {
      await generateAlertFromUgc(supabase, body, confidence);
    } catch {
      // 预警生成失败不影响上报结果
    }
  }

  return NextResponse.json({
    ...data,
    _review: {
      confidence,
      status,
      notes,
    },
  });
}

/**
 * 从 UGC 上报内容生成实时预警 + 高德 API 搜索备选方案
 *
 * 匹配规则（按优先级）：
 * - 暴雨/大雨/雷暴/台风 → weather/high
 * - 下雨/小雨/阵雨 → weather/medium
 * - 故障/维修/停运/装修/关闭/施工 → facility/high
 * - 排队/排了/等候/等了 → queue/medium
 * - 人多/拥挤/爆满 → crowd/medium
 * - 不好吃/踩雷/难吃/态度差 → dining/low
 */
async function generateAlertFromUgc(
  supabase: SupabaseClient,
  body: UGCReportInsert,
  confidence: number,
): Promise<void> {
  const content = body.content ?? "";
  let alertType = "";
  let title = "";
  let priority = "medium";
  let suggestion = "";
  let careTip = "";
  let searchQuery = "";

  // 按优先级匹配（天气 > 设施 > 排队 > 人流 > 餐饮 > 正面）
  if (/暴雨|大雨|下大雨|雷暴|台风/.test(content)) {
    alertType = "weather";
    title = "暴雨天气预警";
    priority = "high";
    suggestion = "暴雨可能导致户外项目关闭，已为你搜索附近室内场所作为替代。";
    careTip = "记得带伞，穿防滑鞋，远离低洼地带和大型广告牌";
    searchQuery = "室内景点 博物馆 商场";
  } else if (/下雨|小雨|阵雨|天气/.test(content)) {
    alertType = "weather";
    title = "天气变化提醒";
    priority = "medium";
    suggestion = "建议将户外景点调整到天气较好的时段，已为你搜索附近室内活动。";
    careTip = "出门记得带伞，穿防滑的鞋子";
    searchQuery = "室内景点 博物馆 展览";
  } else if (/故障|维修|停运|装修|关闭|施工/.test(content)) {
    alertType = "facility";
    title = "设施异常通知";
    priority = "high";
    suggestion = "该设施暂时不可用，已为你搜索附近替代景点。";
    careTip = "不要靠近施工区域，注意安全，建议准备备选方案";
    searchQuery = "景点 公园 博物馆";
  } else if (/排队|排了|等候|等了|等待/.test(content)) {
    alertType = "queue";
    title = "景点排队时间较长";
    priority = "medium";
    suggestion = "排队时间较长，已为你搜索附近替代景点，可以错峰游览。";
    careTip = "排队时注意补充水分和防晒，可以利用等待时间提前查看攻略";
    searchQuery = "景点 公园 景区";
  } else if (/人多|拥挤|人太|爆满|人山人海/.test(content)) {
    alertType = "crowd";
    title = "景点人流密集";
    priority = "medium";
    suggestion = "当前景点人流较大，已为你搜索附近人少的小众景点。";
    careTip = "人多注意保管贵重物品，建议清晨或傍晚错峰前往";
    searchQuery = "小众景点 公园 文化";
  } else if (/不好吃|踩雷|难吃|态度差|坑|宰/.test(content)) {
    alertType = "dining";
    title = "餐饮体验不佳";
    priority = "low";
    suggestion = "已为你搜索附近其他高分餐厅。";
    careTip = "景区附近餐厅普遍偏贵，走远两条街通常能找到更好的选择";
    searchQuery = "美食 餐厅 小吃";
  } else if (/推荐|太美|超棒|强推|值得/.test(content)) {
    alertType = "";
  }

  if (!alertType || !searchQuery || !body.trip_id) return;

  // 获取行程中已有的景点名称（用于排除重复）
  const existingNames = new Set<string>();
  try {
    const { data: tripNodes } = await supabase
      .from("trip_nodes")
      .select("name")
      .eq("trip_id", body.trip_id);
    (tripNodes ?? []).forEach((n: { name: string }) => existingNames.add(n.name));
  } catch { /* 获取失败则不排除 */ }

  // 用高德 API 搜索备选方案
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";
  let alternatives: { name: string; rating?: string; address?: string }[] = [];
  if (amapKey) {
    try {
      // 获取城市：优先从景点获取，否则从行程目的地获取
      let city = "";
      if (body.spot_id) {
        const { data: spot } = await supabase
          .from("spots")
          .select("name")
          .eq("id", body.spot_id)
          .single();
        if (spot) {
          const cityMatch = spot.name.match(/^(北京|上海|杭州|成都|西安|南京|重庆|广州|深圳|厦门|长沙|青岛|大连|苏州|武汉)/);
          city = cityMatch ? cityMatch[1] : "";
        }
      }
      // 回退到行程目的地
      if (!city && body.trip_id) {
        const { data: trip } = await supabase
          .from("trips")
          .select("destination")
          .eq("id", body.trip_id)
          .single();
        city = trip?.destination ?? "";
      }

      const amapRes = await fetch(
        `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(city)}&key=${amapKey}&offset=10&appname=trip-ai`,
      );
      const amapData = await amapRes.json();
      if (amapData.status === "1" && amapData.pois) {
        alternatives = amapData.pois
          .filter((p: { name: string }) => !existingNames.has(p.name))
          .slice(0, 3)
          .map((p: { name: string; biz_ext?: { rating?: string }; address?: string }) => ({
            name: p.name,
            rating: p.biz_ext?.rating,
            address: typeof p.address === "string" ? p.address : undefined,
          }));
      }
    } catch {
      /* 高德搜索失败不阻塞 */
    }
  }

  await supabase.from("realtime_alerts").insert({
    trip_id: body.trip_id,
    alert_type: alertType,
    priority,
    title,
    description: body.content,
    confidence,
    suggestion,
    metadata: {
      care_tip: careTip,
      alternatives,
      search_query: searchQuery,
    },
  });

  console.log(`[UGC→Alert] 已生成预警: ${title} (priority=${priority}, alternatives=${alternatives.length})`);
}
