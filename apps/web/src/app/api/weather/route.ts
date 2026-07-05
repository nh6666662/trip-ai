import { NextRequest, NextResponse } from 'next/server';
import {
  getWeatherNow,
  getWeatherForecast,
  getWeatherWarnings,
  getAirQuality,
  isWeatherConfigured,
} from '@/lib/weather';

/**
 * GET /api/weather?location=杭州
 *
 * 返回目的地完整天气信息：
 * - 实时天气（now）
 * - 7 天预报（forecast）
 * - 灾害预警（warnings）
 * - 空气质量（airQuality）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: '缺少 location 参数' }, { status: 400 });
  }

  if (!isWeatherConfigured()) {
    return NextResponse.json({
      configured: false,
      message: '天气 API 未配置，请在 .env.local 中设置 QWEATHER_API_KEY',
    });
  }

  try {
    const [now, forecast, warnings, airQuality] = await Promise.all([
      getWeatherNow(location),
      getWeatherForecast(location),
      getWeatherWarnings(location),
      getAirQuality(location),
    ]);

    return NextResponse.json({
      configured: true,
      now,
      forecast,
      warnings,
      airQuality,
    });
  } catch (e) {
    console.error('[Weather API] 查询失败:', e);
    return NextResponse.json(
      { configured: true, error: '天气查询失败' },
      { status: 500 },
    );
  }
}
