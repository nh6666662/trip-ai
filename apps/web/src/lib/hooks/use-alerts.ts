"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { API_ENDPOINTS, CONFIDENCE_THRESHOLDS } from "@trip-ai/shared";
import type { RealtimeAlert } from "@/types/database";

/** 稳定空数组常量，避免每次渲染创建新引用 */
const EMPTY_ALERTS: RealtimeAlert[] = [];

/**
 * 观察者模式 — 实时预警推送
 * 利用 Supabase Realtime 订阅 realtime_alerts 表变更，
 * 仅推送高置信度（>= 0.7）预警，避免信息过载。
 */
export function useRealtimeAlerts(tripId: string | undefined) {
  // 修复 HIGH: 用 useMemo 稳定 supabase 引用，避免每次渲染创建新对象
  const supabase = useMemo(() => createBrowserClient(), []);
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealtimeAlert[]>(EMPTY_ALERTS);

  const { data: alerts } = useQuery({
    queryKey: tripId ? queryKeys.alerts(tripId) : ["alerts", "none"],
    queryFn: () =>
      apiFetch<RealtimeAlert[]>(`${API_ENDPOINTS.tripById(tripId!)}/alerts`),
    enabled: !!tripId,
  });

  // 修复 CRITICAL: 去掉 = [] 默认值，改为安全同步（仅 alerts 有值时更新）
  useEffect(() => {
    if (alerts) {
      setRealtimeAlerts(alerts);
    } else if (!tripId) {
      setRealtimeAlerts(EMPTY_ALERTS);
    }
  }, [alerts, tripId]);

  useEffect(() => {
    if (!tripId) return;
    const channel = supabase
      .channel(`alerts:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "realtime_alerts",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const newAlert = payload.new as RealtimeAlert;
          if (newAlert.confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
            setRealtimeAlerts((prev) =>
              prev.some((a) => a.id === newAlert.id)
                ? prev
                : [newAlert, ...prev],
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // 修复: 从依赖数组中移除 supabase（已通过 useMemo 稳定）
  }, [tripId]);

  const acceptSuggestion = useCallback(
    async (alertId: string) => {
      await apiFetch(`${API_ENDPOINTS.tripById(tripId!)}/alerts/${alertId}`, {
        method: "PATCH",
        body: { status: "accepted" },
      });
      // 采纳后从列表移除（与 dismissAlert 行为一致）
      setRealtimeAlerts((prev) => prev.filter((a) => a.id !== alertId));
    },
    [tripId],
  );

  const dismissAlert = useCallback(
    async (alertId: string, reason?: string) => {
      // 携带拒绝原因与时间戳，便于后续分析 UGC 预警质量
      const body: {
        status: string;
        dismiss_reason?: string;
        dismissed_at?: string;
      } = { status: "dismissed" };
      if (reason) {
        body.dismiss_reason = reason;
        body.dismissed_at = new Date().toISOString();
      }
      await apiFetch(`${API_ENDPOINTS.tripById(tripId!)}/alerts/${alertId}`, {
        method: "PATCH",
        body,
      });
      setRealtimeAlerts((prev) => prev.filter((a) => a.id !== alertId));
    },
    [tripId],
  );

  return {
    alerts: realtimeAlerts,
    acceptSuggestion,
    dismissAlert,
  };
}
