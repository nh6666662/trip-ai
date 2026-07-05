"use client";

import { create } from "zustand";
import type { Database } from "@/types/database";

type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];

interface SessionState {
  user: UserProfile | null;
  isLoading: boolean;
  /** 已登录但尚未创建 user_profiles 记录时的兜底用户名 */
  fallbackEmail: string | null;

  setUser: (user: UserProfile | null) => void;
  setLoading: (v: boolean) => void;
  setFallbackEmail: (email: string | null) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  isLoading: true,
  fallbackEmail: null,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (v) => set({ isLoading: v }),
  setFallbackEmail: (email) => set({ fallbackEmail: email }),
  updateProfile: (patch) =>
    set((state) =>
      state.user ? { user: { ...state.user, ...patch } } : state,
    ),
  signOut: () => set({ user: null, fallbackEmail: null, isLoading: false }),
}));
