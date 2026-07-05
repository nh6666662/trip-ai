import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/places/reverse — 高德逆地理编码 API
 *
 * 查询参数:
 * - lat: 纬度（必填）
 * - lng: 经度（必填）
 *
 * 返回: { formatted_address, city, name }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY ?? "";

  if (!lat || !lng) {
    return NextResponse.json({ error: "缺少 lat/lng 参数" }, { status: 400 });
  }
  if (!amapKey) {
    return NextResponse.json({ error: "高德 API Key 未配置" }, { status: 500 });
  }

  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${amapKey}&extensions=base`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "1" || !data.regeocode) {
      return NextResponse.json({ error: "逆地理编码失败" }, { status: 500 });
    }

    const addr = data.regeocode.formatted_address ?? "";
    const addrComp = data.regeocode.addressComponent ?? {};
    const city = addrComp.city ?? addrComp.province ?? "";
    // 优先取最近的 POI 名称
    const pois = data.regeocode.pois ?? [];
    const name = pois.length > 0 ? pois[0].name : (addrComp.township || addrComp.district || "当前位置");

    return NextResponse.json({
      formatted_address: addr,
      city,
      name,
      location: { lat: Number(lat), lng: Number(lng) },
    });
  } catch {
    return NextResponse.json({ error: "逆地理编码失败" }, { status: 500 });
  }
}
