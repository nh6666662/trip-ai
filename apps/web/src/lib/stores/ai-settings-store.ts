"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BUILTIN_PROVIDERS,
  DEFAULT_PROVIDER_ID,
  type CustomProvider,
  type AIProvider,
} from "@/lib/ai/providers";

interface AiSettingsState {
  /** 当前激活的提供商 id */
  activeProviderId: string;
  /** 用户自定义提供商列表（含 API Key） */
  customProviders: CustomProvider[];

  // actions
  setActiveProvider: (id: string) => void;
  addCustomProvider: (p: Omit<CustomProvider, "builtin">) => void;
  updateCustomProvider: (id: string, patch: Partial<CustomProvider>) => void;
  removeCustomProvider: (id: string) => void;
  /** 获取当前激活的提供商（内置或自定义） */
  getActiveProvider: () => AIProvider | undefined;
  /** 获取自定义提供商的 API Key（仅内置提供商返回 null，由服务端 env 提供） */
  getApiKey: (id: string) => string | null;
}

export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set, get) => ({
      activeProviderId: DEFAULT_PROVIDER_ID,
      customProviders: [],

      setActiveProvider: (id) => set({ activeProviderId: id }),

      addCustomProvider: (p) =>
        set((state) => ({
          customProviders: [...state.customProviders, { ...p, builtin: false }],
        })),

      updateCustomProvider: (id, patch) =>
        set((state) => ({
          customProviders: state.customProviders.map((p) =>
            p.id === id ? { ...p, ...patch, builtin: false } : p,
          ),
        })),

      removeCustomProvider: (id) =>
        set((state) => {
          const filtered = state.customProviders.filter((p) => p.id !== id);
          const nextActive =
            state.activeProviderId === id
              ? DEFAULT_PROVIDER_ID
              : state.activeProviderId;
          return { customProviders: filtered, activeProviderId: nextActive };
        }),

      getActiveProvider: () => {
        const { activeProviderId, customProviders } = get();
        const builtin = BUILTIN_PROVIDERS.find((p) => p.id === activeProviderId);
        if (builtin) return builtin;
        return customProviders.find((p) => p.id === activeProviderId);
      },

      getApiKey: (id) => {
        const custom = get().customProviders.find((p) => p.id === id);
        return custom?.apiKey ?? null;
      },
    }),
    {
      name: "trip-ai-ai-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeProviderId: state.activeProviderId,
        customProviders: state.customProviders,
      }),
    },
  ),
);
