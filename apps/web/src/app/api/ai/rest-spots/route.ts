import { NextRequest, NextResponse } from "next/server";
import { resolveProvider, streamLLM } from "@/lib/ai/chat";

export const runtime = "nodejs";

/**
 * POST /api/ai/rest-spots — AI 推荐附近的休息点
 *
 * 请求体: { destination, spotName?, spotLocation? }
 * 返回: { spots: [{ name, reason, type }] }
 *
 * 休息点类型：咖啡馆、茶馆、公园、商场休息区、便利店、书店、公共休息区等
 * 若 AI 不可用，降级为规则生成。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    destination = "",
    spotName = "",
    spotLocation,
  } = body as {
    destination?: string;
    spotName?: string;
    spotLocation?: { lat: number; lng: number };
  };

  // 优先用高德周边搜索（types=050500 咖啡厅 + 060100 购物 + 110200 公园广场）
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";
  if (amapKey && spotLocation) {
    try {
      // 并行搜索 3 类休息点
      const [cafeRes, shopRes, parkRes] = await Promise.all([
        fetchAmapAround(amapKey, spotLocation, "050500", destination), // 咖啡厅
        fetchAmapAround(amapKey, spotLocation, "060100", destination), // 购物
        fetchAmapAround(amapKey, spotLocation, "110200", destination), // 公园广场
      ]);
      const spots = [...cafeRes, ...shopRes, ...parkRes]
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, 6);
      if (spots.length > 0) {
        return NextResponse.json({ spots });
      }
    } catch {
      // 降级到 AI
    }
  }

  // AI 生成休息点建议
  const resolved = resolveProvider({ id: "agnes" });
  if (resolved) {
    try {
      const context = `目的地：${destination}\n当前景点：${spotName || "未知"}\n请推荐4个附近的休息点，包括咖啡馆、茶馆、公园、商场等。`;
      const messages = [
        {
          role: "system",
          content:
            '你是旅行休息点推荐器。根据用户位置推荐4个附近休息点。返回JSON数组格式：[{"name":"地点名","reason":"推荐理由(10字内)","type":"类型"}]。类型可选：咖啡馆/茶馆/公园/商场/书店/便利店。直接返回JSON，不要其他文字。',
        },
        { role: "user", content: context },
      ];
      const stream = streamLLM(messages, resolved);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }
      // 提取 JSON
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const spots = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ spots });
      }
    } catch {
      // 降级到规则
    }
  }

  // 降级：规则生成
  return NextResponse.json({
    spots: [
      { name: `${destination}中心公园`, reason: "环境清幽可歇脚", type: "公园" },
      { name: "附近咖啡馆", reason: "休息充电好去处", type: "咖啡馆" },
      { name: "商场休息区", reason: "空调充足有座位", type: "商场" },
      { name: "便利店", reason: "快速补给歇脚", type: "便利店" },
    ],
  });
}

/** 调用高德周边搜索 */
async function fetchAmapAround(
  amapKey: string,
  location: { lat: number; lng: number },
  types: string,
  city: string,
) {
  const params = new URLSearchParams({
    key: amapKey,
    location: `${location.lng},${location.lat}`,
    types,
    radius: "2000",
    sortrule: "distance",
    offset: "5",
    page: "1",
    extensions: "all",
  });
  if (city) params.set("city", city);
  const url = `https://restapi.amap.com/v3/place/around?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "1" || !data.pois) return [];
  return (data.pois as any[])
    .filter((p) => p.location && typeof p.location === "string")
    .map((p) => {
      const [lng, lat] = p.location.split(",").map(Number);
      const dx = lng - location.lng;
      const dy = lat - location.lat;
      const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 111000);
      return {
        name: p.name,
        address: p.address ?? "",
        location: { lat, lng },
        distance,
        type: getTypeLabel(types),
        reason: getReasonByType(types),
      };
    });
}

function getTypeLabel(types: string): string {
  if (types === "050500") return "咖啡馆";
  if (types === "060100") return "商场";
  if (types === "110200") return "公园";
  return "休息点";
}

function getReasonByType(types: string): string {
  if (types === "050500") return "喝杯咖啡歇歇脚";
  if (types === "060100") return "空调充足有座位";
  if (types === "110200") return "环境清幽可歇脚";
  return "休息补给好去处";
}
