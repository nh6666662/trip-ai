"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Trip, TripNode } from "@/types/database";

/** 草稿行程输入（AI 生成表单） */
export interface TripDraft {
  destination: string;
  departure: string;
  startDate: string;
  endDate: string;
  pace: "tight" | "relaxed";
  travelerCount: number;
  preferences: string[];
}

/** 冲突检测结果 */
export interface Conflict {
  nodeId: string;
  type: "time_overlap" | "closed" | "transit_too_long";
  message: string;
  severity: "warning" | "error";
}

interface TripState {
  /** 当前编辑中的行程 */
  currentTrip: Trip | null;
  /** 当前行程的节点列表（按 sort_order 排序） */
  nodes: TripNode[];
  /** 当前选中节点 id */
  selectedNodeId: string | null;
  /** AI 生成表单草稿 */
  draft: TripDraft;
  /** 是否正在生成行程 */
  isGenerating: boolean;
  /** 检测到的冲突列表 */
  conflicts: Conflict[];

  // actions
  setCurrentTrip: (trip: Trip | null) => void;
  setNodes: (nodes: TripNode[]) => void;
  addNode: (node: TripNode) => void;
  updateNode: (id: string, patch: Partial<TripNode>) => void;
  removeNode: (id: string) => void;
  reorderNodes: (sourceIdx: number, targetIdx: number) => void;
  selectNode: (id: string | null) => void;
  setDraft: (patch: Partial<TripDraft>) => void;
  setGenerating: (v: boolean) => void;
  setConflicts: (c: Conflict[]) => void;
  reset: () => void;
}

const defaultDraft: TripDraft = {
  destination: "",
  departure: "",
  startDate: "",
  endDate: "",
  pace: "relaxed",
  travelerCount: 1,
  preferences: [],
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      currentTrip: null,
      nodes: [],
      selectedNodeId: null,
      draft: defaultDraft,
      isGenerating: false,
      conflicts: [],

      setCurrentTrip: (trip) => set({ currentTrip: trip }),
      setNodes: (nodes) =>
        set({ nodes: [...nodes].sort((a, b) => a.sort_order - b.sort_order) }),
      addNode: (node) => set({ nodes: [...get().nodes, node] }),
      updateNode: (id, patch) =>
        set({
          nodes: get().nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        }),
      removeNode: (id) =>
        set({
          nodes: get().nodes.filter((n) => n.id !== id),
          selectedNodeId:
            get().selectedNodeId === id ? null : get().selectedNodeId,
        }),
      reorderNodes: (sourceIdx, targetIdx) => {
        const nodes = [...get().nodes];
        if (
          sourceIdx < 0 ||
          targetIdx < 0 ||
          sourceIdx >= nodes.length ||
          targetIdx >= nodes.length
        )
          return;
        const [moved] = nodes.splice(sourceIdx, 1);
        nodes.splice(targetIdx, 0, moved);
        // 重新计算 sort_order
        const reindexed = nodes.map((n, i) => ({ ...n, sort_order: i }));
        set({ nodes: reindexed });
      },
      selectNode: (id) => set({ selectedNodeId: id }),
      setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
      setGenerating: (v) => set({ isGenerating: v }),
      setConflicts: (c) => set({ conflicts: c }),
      reset: () =>
        set({
          currentTrip: null,
          nodes: [],
          selectedNodeId: null,
          conflicts: [],
          isGenerating: false,
        }),
    }),
    {
      name: "trip-ai-trip",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        draft: state.draft,
        currentTrip: state.currentTrip,
        nodes: state.nodes,
        selectedNodeId: state.selectedNodeId,
      }),
    },
  ),
);
