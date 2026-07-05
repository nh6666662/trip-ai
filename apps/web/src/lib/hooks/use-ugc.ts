"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { API_ENDPOINTS } from "@trip-ai/shared";
import type { UgcFeedItem } from "@/types/api";
import type { UGCReportInsert } from "@/types/database";

/** UGC 社区信息流 */
export function useUgcFeed(filter?: string) {
  return useQuery({
    queryKey: queryKeys.ugcFeed(filter),
    queryFn: () =>
      apiFetch<UgcFeedItem[]>(
        `${API_ENDPOINTS.ugcFeed}?type=${filter ?? "all"}`,
      ),
  });
}

/** 创建 UGC 上报 */
export function useCreateUgc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UGCReportInsert) =>
      apiFetch<UGCReportInsert>(API_ENDPOINTS.ugcReports, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.ugcFeed() }),
  });
}

/** 点赞 UGC — 修复双重计数 bug */
export function useVoteUgc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; upvotes: number }>(
        `${API_ENDPOINTS.ugcReports}/${id}/upvote`,
        { method: "POST" },
      ),
    // 乐观更新：点击瞬间在缓存中 +1
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["ugc"] });
      const snapshot = qc.getQueriesData<UgcFeedItem[]>({ queryKey: ["ugc"] });
      qc.setQueriesData<UgcFeedItem[]>({ queryKey: ["ugc"] }, (prev) => {
        if (!prev) return prev;
        return prev.map((item) =>
          item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item,
        );
      });
      return { snapshot };
    },
    // 服务端返回真实值，直接写入缓存（不再 +1，避免双重计数）
    onSuccess: (data, id) => {
      qc.setQueriesData<UgcFeedItem[]>({ queryKey: ["ugc"] }, (prev) => {
        if (!prev) return prev;
        return prev.map((item) =>
          item.id === id ? { ...item, upvotes: data.upvotes } : item,
        );
      });
    },
    // 失败回滚
    onError: (_err, _id, ctx) => {
      if (ctx?.snapshot) {
        ctx.snapshot.forEach(([key, data]) => {
          qc.setQueryData(key, data);
        });
      }
    },
  });
}
