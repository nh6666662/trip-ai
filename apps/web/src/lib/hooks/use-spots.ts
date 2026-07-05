"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { API_ENDPOINTS } from "@trip-ai/shared";
import type { Spot } from "@/types/database";

/** 景点列表（可按关键词筛选） */
export function useSpots(keyword?: string) {
  return useQuery({
    queryKey: queryKeys.spots(keyword),
    queryFn: () =>
      apiFetch<Spot[]>(
        `${API_ENDPOINTS.ugcFeed.replace("/feed", "/spots")}${keyword ? `?q=${keyword}` : ""}`,
      ),
    // 兜底：若 /api/ugc/spots 不存在则返回空数组
    retry: false,
  });
}
