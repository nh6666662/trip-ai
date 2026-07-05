"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { API_ENDPOINTS } from "@trip-ai/shared";
import type {
  GenerateTripRequest,
  GenerateTripResponse,
  TripListItem,
} from "@/types/api";
import type { Trip, TripNode, TripInsert } from "@/types/database";

/** 当前用户行程列表 */
export function useTrips() {
  return useQuery({
    queryKey: queryKeys.trips,
    queryFn: () => apiFetch<TripListItem[]>(API_ENDPOINTS.trips),
  });
}

/** 单个行程详情（含节点） */
export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.trip(id) : ["trips", "undefined"],
    queryFn: () => apiFetch<GenerateTripResponse>(API_ENDPOINTS.tripById(id!)),
    enabled: !!id,
  });
}

/** 创建行程 */
export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TripInsert) =>
      apiFetch<Trip>(API_ENDPOINTS.trips, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trips }),
  });
}

/** AI 生成行程（调用 Edge Function 代理） */
export function useGenerateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateTripRequest) =>
      apiFetch<GenerateTripResponse>(API_ENDPOINTS.tripGenerate, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trips }),
  });
}

/** 更新节点 */
export function useUpdateNode(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      nodeId,
      patch,
    }: {
      nodeId: string;
      patch: Partial<TripNode>;
    }) =>
      apiFetch<TripNode>(`${API_ENDPOINTS.tripById(tripId)}/nodes/${nodeId}`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  });
}

/** 删除节点 */
export function useDeleteNode(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: string) =>
      apiFetch<{ id: string }>(
        `${API_ENDPOINTS.tripById(tripId)}/nodes/${nodeId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  });
}

/** 拖拽重排序 */
export function useReorderNodes(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiFetch<void>(`${API_ENDPOINTS.tripById(tripId)}/nodes/reorder`, {
        method: "POST",
        body: { orderedIds },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  });
}

/** 删除行程 */
export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(API_ENDPOINTS.tripById(id), {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trips }),
  });
}
