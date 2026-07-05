/** 统一 Query Key 工厂，避免 key 拼写不一致 */
export const queryKeys = {
  trips: ["trips"] as const,
  trip: (id: string) => ["trips", id] as const,
  tripNodes: (tripId: string) => ["trips", tripId, "nodes"] as const,
  ugcFeed: (filter?: string) => ["ugc", "feed", filter ?? "all"] as const,
  ugcReport: (id: string) => ["ugc", id] as const,
  spots: (filter?: string) => ["spots", filter ?? "all"] as const,
  spot: (id: string) => ["spots", id] as const,
  alerts: (tripId: string) => ["alerts", tripId] as const,
};
