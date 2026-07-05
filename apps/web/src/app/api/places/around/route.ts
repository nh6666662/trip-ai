import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/places/around — 高德周边搜索 API
 *
 * 查询参数:
 * - location: 经纬度 "lng,lat"（必填）
 * - types: POI 类型码（可选，默认 050000 餐饮服务）
 * - radius: 搜索半径（可选，默认 3000 米）
 * - city: 城市名（可选，限定搜索范围）
 *
 * 返回: [{ name, address, location: { lat, lng }, tel, typecode }]
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location") ?? "";
  const types = searchParams.get("types") ?? "050000"; // 默认餐饮服务
  const radius = searchParams.get("radius") ?? "3000";
  const city = searchParams.get("city") ?? "";
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";

  if (!location.trim()) {
    return NextResponse.json({ error: "缺少 location 参数" }, { status: 400 });
  }
  if (!amapKey) {
    return NextResponse.json({ error: "高德 API Key 未配置" }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      key: amapKey,
      location,
      types,
      radius,
      sortrule: "weight", // 按综合权重排序（类似"扫街榜"）
      offset: "10",
      page: "1",
      extensions: "all",
    });
    if (city) params.set("city", city);

    const url = `https://restapi.amap.com/v3/place/around?${params}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.pois) {
      return NextResponse.json([]);
    }

    const pois = (data.pois as any[])
      .filter((p) => p.location && typeof p.location === "string")
      .map((p) => {
        const [lng, lat] = p.location.split(",").map(Number);
        return {
          name: p.name,
          address: p.address ?? "",
          location: { lat, lng },
          tel: p.tel ?? "",
          typecode: p.typecode ?? "",
          biz_ext: p.biz_ext ?? {},
        };
      })
      .slice(0, 10);

    return NextResponse.json(pois);
  } catch {
    return NextResponse.json({ error: "周边搜索失败" }, { status: 500 });
  }
}
