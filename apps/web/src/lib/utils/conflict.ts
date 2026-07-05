/** 行程节点冲突检测 — 仅检测相邻节点冲突（MVP 简化） */
import type { TripNode } from "@/types/database";
import type { Conflict } from "@/lib/stores/trip-store";

/**
 * 检测节点列表中的冲突：
 * - time_overlap: 前一节点未结束，下一节点已开始
 * - transit_too_long: 相邻节点交通耗时异常（> 120 分钟）
 */
export function detectConflicts(nodes: TripNode[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const sorted = [...nodes].sort((a, b) => a.sort_order - b.sort_order);

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    const curEnd =
      new Date(cur.start_time).getTime() + cur.duration_minutes * 60000;
    const nextStart = new Date(next.start_time).getTime();
    const transit = next.transit_minutes || 0;

    // 时间重叠：当前节点结束后 + 交通时间 仍晚于下一节点开始
    if (curEnd + transit * 60000 > nextStart) {
      conflicts.push({
        nodeId: next.id,
        type: "time_overlap",
        message: `与"${cur.name}"时间冲突，需预留 ${transit} 分钟交通`,
        severity: "error",
      });
    } else if (transit > 120) {
      conflicts.push({
        nodeId: next.id,
        type: "transit_too_long",
        message: `交通耗时 ${transit} 分钟偏长，建议调整顺序或拆分行程`,
        severity: "warning",
      });
    }
  }

  return conflicts;
}
