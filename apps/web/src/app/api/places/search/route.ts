import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/places/search — 高德输入提示 API
 *
 * 查询参数:
 * - keywords: 搜索关键词（必填）
 * - city: 城市名（可选，限定搜索范围）
 *
 * 返回: [{ name, district, address, location: { lat, lng } }]
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keywords = searchParams.get("keywords") ?? "";
  const city = searchParams.get("city") ?? "";
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";

  if (!keywords.trim()) {
    return NextResponse.json([]);
  }
  if (!amapKey) {
    return NextResponse.json({ error: "高德 API Key 未配置" }, { status: 500 });
  }

  try {
    const url = `https://restapi.amap.com/v3/assistant/inputtips?keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city)}&citylimit=false&key=${amapKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.tips) {
      return NextResponse.json([]);
    }

    const tips = (data.tips as any[])
      .filter((t) => t.location && typeof t.location === "string")
      .map((t) => {
        const [lng, lat] = t.location.split(",").map(Number);
        return {
          name: t.name,
          district: t.district ?? "",
          address: `${t.district ?? ""}${t.name ?? ""}`.trim(),
          location: { lat, lng },
        };
      })
      .slice(0, 10);

    return NextResponse.json(tips);
  } catch {
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}
