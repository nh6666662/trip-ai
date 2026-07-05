/**
 * 和风天气 → Harness Engine WeatherData 适配器
 * 将和风天气 API 返回格式转换为 scoreWeather() 所需的 WeatherData 格式
 */
import type { WeatherData } from '@/lib/harness/tools';
import type { QWeatherForecast, QWeatherNow } from './index';

/** 天气文本 → 降雨概率映射 */
const RAIN_MAP: Record<string, number> = {
  '晴': 0, '多云': 0.05, '阴': 0.1,
  '阵雨': 0.4, '小雨': 0.5, '中雨': 0.7,
  '大雨': 0.85, '暴雨': 0.95, '雷阵雨': 0.6,
  '小雪': 0.5, '中雪': 0.7, '大雪': 0.9, '暴雪': 0.95,
  '雨夹雪': 0.6, '冻雨': 0.7,
};

/** 将 7 天预报中某一天的数据转换为 WeatherData */
export function forecastToWeatherData(forecast: QWeatherForecast): WeatherData {
  return {
    condition: forecast.textDay,
    temperature: (parseFloat(forecast.tempMax) + parseFloat(forecast.tempMin)) / 2,
    rainProbability: RAIN_MAP[forecast.textDay] ?? 0.3,
    humidity: parseFloat(forecast.humidity) || 50,
    windSpeed: parseFloat(forecast.windSpeedDay) || 10,
  };
}

/** 将实时天气数据转换为 WeatherData */
export function nowToWeatherData(now: QWeatherNow): WeatherData {
  return {
    condition: now.text,
    temperature: parseFloat(now.temp) || 20,
    rainProbability: RAIN_MAP[now.text] ?? 0.3,
    humidity: parseFloat(now.humidity) || 50,
    windSpeed: parseFloat(now.windSpeed) || 10,
  };
}
