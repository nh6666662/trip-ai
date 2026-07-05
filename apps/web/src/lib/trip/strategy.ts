/**
 * 策略模式 — 多版本行程生成算法
 * 对应《项目总纲.md》4.3.2
 * MVP 简化：基于景点列表与节奏模板贪心排程，不做深度定制。
 */
import type { Spot, TripNodeInsert } from "@/types/database";
import { uuid, daysBetween, addMinutes } from "@/lib/utils/format";

export interface GenerateParams {
  spots: Spot[];
  pace: "tight" | "relaxed";
  startDate: string;
  endDate: string;
  destination: string;
}

/** 生成节点（不含 trip_id，持久化时补充） */
export type GeneratedNode = Omit<TripNodeInsert, "trip_id">;

export interface GeneratedTrip {
  nodes: GeneratedNode[];
  pace: "tight" | "relaxed";
}

export interface TripGenerationStrategy {
  generate(params: GenerateParams): GeneratedTrip;
}

/** 紧凑策略 — 最早 8:00 出发，最小化休息，最大化景点覆盖 */
export class TightStrategy implements TripGenerationStrategy {
  generate(params: GenerateParams): GeneratedTrip {
    const { spots, startDate, endDate } = params;
    const days = daysBetween(startDate, endDate);
    const sorted = sortByProximity(spots);
    const nodes: GeneratedNode[] = [];
    const perDay = Math.ceil(sorted.length / days);
    const chunks = chunk(sorted, perDay);

    chunks.forEach((daySpots, dayIdx) => {
      const dayDate = addDays(new Date(startDate), dayIdx);
      let currentTime = setTimeOnDate(dayDate, "08:00");

      daySpots.forEach((spot, i) => {
        const duration = spot.min_visit_minutes || 90;
        nodes.push({
          id: uuid(),
          name: spot.name,
          spot_id: safeSpotId(spot),
          node_type: "spot",
          start_time: currentTime.toISOString(),
          duration_minutes: duration,
          transit_minutes: 20,
          sort_order: nodes.length,
          metadata: { rating: spot.rating, day: dayIdx + 1, external_id: spot.id, latitude: spot.latitude, longitude: spot.longitude },
        });
        currentTime = addMinutes(currentTime, duration + 20);

        // 午餐插入（约 12:00）
        if (
          i === Math.floor(daySpots.length / 2) - 1 &&
          currentTime.getHours() < 13
        ) {
          nodes.push({
            id: uuid(),
            name: "午餐",
            node_type: "meal",
            start_time: currentTime.toISOString(),
            duration_minutes: 60,
            transit_minutes: 10,
            sort_order: nodes.length,
            metadata: { day: dayIdx + 1 },
          });
          currentTime = addMinutes(currentTime, 70);
        }
      });
    });

    return { nodes, pace: "tight" };
  }
}

/** 松弛策略 — 9:00 出发，每日最多 3 个核心景点，预留休息 */
export class RelaxedStrategy implements TripGenerationStrategy {
  private readonly REST_BUFFER = 45;
  private readonly MEAL_DURATION = 90;

  generate(params: GenerateParams): GeneratedTrip {
    const { spots, startDate, endDate } = params;
    const days = daysBetween(startDate, endDate);
    const curated = spots.slice(0, days * 3); // 每日最多 3 个
    const chunks = chunk(curated, 3);
    const nodes: GeneratedNode[] = [];

    chunks.forEach((daySpots, dayIdx) => {
      const dayDate = addDays(new Date(startDate), dayIdx);
      let currentTime = setTimeOnDate(dayDate, "09:00");

      daySpots.forEach((spot, i) => {
        const duration = spot.recommended_minutes || 120;
        nodes.push({
          id: uuid(),
          name: spot.name,
          spot_id: safeSpotId(spot),
          node_type: "spot",
          start_time: currentTime.toISOString(),
          duration_minutes: duration,
          transit_minutes: 25,
          sort_order: nodes.length,
          metadata: { rating: spot.rating, day: dayIdx + 1, external_id: spot.id, latitude: spot.latitude, longitude: spot.longitude },
        });
        currentTime = addMinutes(currentTime, duration + 25);

        // 午餐（12:00 前后）
        if (i === 0) {
          const lunchTime = setTimeOnDate(dayDate, "12:00");
          currentTime = lunchTime;
          nodes.push({
            id: uuid(),
            name: "午餐",
            node_type: "meal",
            start_time: lunchTime.toISOString(),
            duration_minutes: this.MEAL_DURATION,
            transit_minutes: 15,
            sort_order: nodes.length,
            metadata: { day: dayIdx + 1 },
          });
          currentTime = addMinutes(currentTime, this.MEAL_DURATION + 15);
        }

        // 景点后休息
        nodes.push({
          id: uuid(),
          name: "休息",
          node_type: "rest",
          start_time: currentTime.toISOString(),
          duration_minutes: this.REST_BUFFER,
          transit_minutes: 15,
          sort_order: nodes.length,
          metadata: { day: dayIdx + 1 },
        });
        currentTime = addMinutes(currentTime, this.REST_BUFFER + 15);
      });
    });

    return { nodes, pace: "relaxed" };
  }
}

/** 策略工厂 */
export function createStrategy(
  pace: "tight" | "relaxed",
): TripGenerationStrategy {
  switch (pace) {
    case "tight":
      return new TightStrategy();
    case "relaxed":
      return new RelaxedStrategy();
  }
}

// ===== 内部工具 =====

/** 检查 ID 是否为合法 UUID（数据库 spots 表主键格式） */
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** 安全获取 spot_id：仅数据库 UUID 格式才写入外键，否则置 null */
function safeSpotId(spot: Spot): string | null {
  return spot.id && isValidUUID(spot.id) ? spot.id : null;
}

function sortByProximity(spots: Spot[]): Spot[] {
  // MVP 简化：按评分降序，地理贪心留待 V1.0
  return [...spots].sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function setTimeOnDate(date: Date, time: string): Date {
  const d = new Date(date);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export type { TripNodeInsert };
